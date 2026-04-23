const prisma = require('../lib/prisma')

const list = async (req, res) => {
  try {
    const { status } = req.query

    const where = {}
    if (status) where.status = status

    const purchases = await prisma.stockPurchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    res.json(purchases)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const get = async (req, res) => {
  try {
    const purchase = await prisma.stockPurchase.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    })

    if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
    res.json(purchase)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const create = async (req, res) => {
  try {
    const {
      supplier_id,
      warehouse_id,
      items,
      tax_rate = 0,
      notes = ''
    } = req.body

    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' })
    if (!items || items.length === 0) return res.status(400).json({ error: 'items are required' })

    // Validate items have required fields
    for (const item of items) {
      if (!item.product_id) return res.status(400).json({ error: 'Each item must have a product_id' })
      if (!item.quantity || item.quantity <= 0) return res.status(400).json({ error: 'Each item must have a positive quantity' })
      if (!item.cost || item.cost < 0) return res.status(400).json({ error: 'Each item must have a valid cost' })
    }

    // 1. Calculate subtotal = sum(quantity * cost)
    let subtotal = 0
    for (const item of items) {
      subtotal += item.quantity * item.cost
    }

    // 2 & 3. Calculate tax and total
    const tax = subtotal * (tax_rate || 0)
    const total = subtotal + tax

    // 4. Generate purchase number
    const purchase_number = 'PUR-' + Date.now()

    // 5. Create StockPurchase with items (status PENDING)
    const purchase = await prisma.stockPurchase.create({
      data: {
        purchase_number,
        supplier_id: supplier_id ? parseInt(supplier_id) : null,
        warehouse_id: parseInt(warehouse_id),
        subtotal,
        tax,
        total,
        status: 'PENDING',
        notes: notes || '',
        created_by: req.user.id,
        organization_id: req.user.organization_id || null,
        items: {
          create: items.map((item) => ({
            product_id: parseInt(item.product_id),
            quantity: item.quantity,
            cost: item.cost
          }))
        }
      },
      include: {
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    })

    res.status(201).json(purchase)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const update = async (req, res) => {
  try {
    const { notes, status } = req.body
    const purchaseId = parseInt(req.params.id)

    const existing = await prisma.stockPurchase.findUnique({
      where: { id: purchaseId }
    })

    if (!existing) return res.status(404).json({ error: 'Purchase not found' })

    // Only allow update if status is PENDING
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only PENDING purchases can be updated' })
    }

    const data = {}
    if (notes !== undefined) data.notes = notes
    if (status !== undefined) data.status = status

    const purchase = await prisma.stockPurchase.update({
      where: { id: purchaseId },
      data,
      include: {
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    })

    res.json(purchase)
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Purchase not found' })
    res.status(500).json({ error: e.message })
  }
}

const receive = async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id)
    const { received_items } = req.body // optional: [{ purchase_item_id, quantity_received }]

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get purchase with items
      const purchase = await tx.stockPurchase.findUnique({
        where: { id: purchaseId },
        include: { items: true }
      })

      if (!purchase) {
        throw Object.assign(new Error('Purchase not found'), { statusCode: 404 })
      }

      // 2. Return 400 if already received
      if (purchase.status === 'RECEIVED') {
        throw Object.assign(new Error('Purchase is already received'), { statusCode: 400 })
      }

      // Build a map of received quantities
      // If received_items provided, use those quantities; otherwise receive all at full quantity
      const quantityMap = {}
      if (received_items && received_items.length > 0) {
        for (const ri of received_items) {
          quantityMap[ri.purchase_item_id] = ri.quantity_received
        }
      }

      // 3. Add quantity to inventory for each purchase item
      for (const item of purchase.items) {
        const qty =
          received_items && received_items.length > 0
            ? quantityMap[item.id] !== undefined
              ? quantityMap[item.id]
              : 0
            : item.quantity

        if (qty <= 0) continue

        await tx.inventory.upsert({
          where: {
            product_id_warehouse_id: {
              product_id: item.product_id,
              warehouse_id: purchase.warehouse_id
            }
          },
          update: { quantity: { increment: qty } },
          create: {
            product_id: item.product_id,
            warehouse_id: purchase.warehouse_id,
            quantity: qty,
            min_quantity: 0
          }
        })
      }

      // 4. Set status to RECEIVED and received_at = now()
      const updated = await tx.stockPurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RECEIVED',
          received_at: new Date()
        },
        include: {
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } }
            }
          }
        }
      })

      return updated
    })

    res.json(result)
  } catch (e) {
    if (e.statusCode === 404) return res.status(404).json({ error: e.message })
    if (e.statusCode === 400) return res.status(400).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
}

module.exports = { list, get, create, update, receive }
