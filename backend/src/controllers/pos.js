const prisma = require('../lib/prisma')
const { log, notify } = require('../lib/activityLogger')

const listSales = async (req, res) => {
  try {
    const { status, payment_method, from_date, to_date } = req.query

    const where = {}
    if (status) where.status = status
    if (payment_method) where.payment_method = payment_method
    if (from_date || to_date) {
      where.createdAt = {}
      if (from_date) where.createdAt.gte = new Date(from_date)
      if (to_date) where.createdAt.lte = new Date(to_date)
    }

    const sales = await prisma.posSale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        cashier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      }
    })

    res.json(sales)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const getSale = async (req, res) => {
  try {
    const sale = await prisma.posSale.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        cashier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        delivery: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    })

    if (!sale) return res.status(404).json({ error: 'Sale not found' })
    res.json(sale)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const createSale = async (req, res) => {
  try {
    const {
      customer_id,
      warehouse_id,
      items,
      discount = 0,
      tax_rate = 0,
      payment_method = 'CASH',
      notes = ''
    } = req.body

    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' })
    if (!items || items.length === 0) return res.status(400).json({ error: 'items are required' })

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate inventory for each item
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: item.product_id,
              warehouse_id: warehouse_id
            }
          }
        })

        const available = inventory ? inventory.quantity : 0
        if (available < item.quantity) {
          const product = await tx.product.findUnique({
            where: { id: item.product_id },
            select: { name: true, sku: true }
          })
          const label = product ? `${product.name} (${product.sku})` : `Product #${item.product_id}`
          throw Object.assign(
            new Error(`Insufficient stock for ${label}: requested ${item.quantity}, available ${available}`),
            { statusCode: 400 }
          )
        }
      }

      // 2. Calculate subtotal = sum(quantity * price - item.discount)
      let subtotal = 0
      for (const item of items) {
        subtotal += item.quantity * item.price - (item.discount || 0)
      }

      // 3 & 4. Calculate tax and total
      const tax = subtotal * (tax_rate || 0)
      const total = subtotal - (discount || 0) + tax

      // 5. Generate sale number
      const sale_number = 'POS-' + Date.now()

      // 6. Create PosSale with items
      const sale = await tx.posSale.create({
        data: {
          sale_number,
          customer_id: customer_id || null,
          warehouse_id,
          subtotal,
          discount: discount || 0,
          tax,
          total,
          payment_method,
          notes: notes || '',
          created_by: req.user.id,
          organization_id: req.user.organization_id || null,
          items: {
            create: items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              cost: item.cost || 0,
              discount: item.discount || 0
            }))
          }
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } }
            }
          },
          customer: { select: { id: true, name: true, email: true } },
          cashier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } }
        }
      })

      // 7. Reduce inventory for each item
      for (const item of items) {
        await tx.inventory.upsert({
          where: {
            product_id_warehouse_id: {
              product_id: item.product_id,
              warehouse_id: warehouse_id
            }
          },
          update: { quantity: { decrement: item.quantity } },
          create: {
            product_id: item.product_id,
            warehouse_id: warehouse_id,
            quantity: -item.quantity,
            min_quantity: 0
          }
        })
      }

      return sale
    })

    await log({ user_id: req.user.id, action: 'CREATE', module: 'pos', entity_id: result.id, entity_type: 'PosSale', description: `POS sale ${result.sale_number} — $${result.total} via ${payment_method}` });
    await notify(req.app.get('io'), { user_id: req.user.id, type: 'SUCCESS', title: 'Sale Completed', message: `Sale ${result.sale_number} totaling $${result.total} processed successfully` });
    res.status(201).json(result)
  } catch (e) {
    if (e.statusCode === 400) return res.status(400).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
}

const updateSaleStatus = async (req, res) => {
  try {
    const { status } = req.body
    const allowed = ['COMPLETED', 'CANCELLED', 'REFUNDED']

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` })
    }

    const sale = await prisma.posSale.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    })

    res.json(sale)
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Sale not found' })
    res.status(500).json({ error: e.message })
  }
}

const refundSale = async (req, res) => {
  try {
    const { reason } = req.body
    const saleId = parseInt(req.params.id)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get sale with items
      const sale = await tx.posSale.findUnique({
        where: { id: saleId },
        include: { items: true }
      })

      if (!sale) {
        throw Object.assign(new Error('Sale not found'), { statusCode: 404 })
      }

      // 2. Return 400 if already REFUNDED
      if (sale.status === 'REFUNDED') {
        throw Object.assign(new Error('Sale is already refunded'), { statusCode: 400 })
      }

      // 3. Restore inventory for each item
      for (const item of sale.items) {
        await tx.inventory.upsert({
          where: {
            product_id_warehouse_id: {
              product_id: item.product_id,
              warehouse_id: sale.warehouse_id
            }
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            product_id: item.product_id,
            warehouse_id: sale.warehouse_id,
            quantity: item.quantity,
            min_quantity: 0
          }
        })
      }

      // 4. Update sale status to REFUNDED
      const updated = await tx.posSale.update({
        where: { id: saleId },
        data: {
          status: 'REFUNDED',
          notes: reason
            ? `${sale.notes ? sale.notes + ' | ' : ''}REFUND: ${reason}`
            : sale.notes
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } }
            }
          },
          customer: { select: { id: true, name: true, email: true } },
          cashier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } }
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

module.exports = { listSales, getSale, createSale, updateSaleStatus, refundSale }
