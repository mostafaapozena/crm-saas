const prisma = require('../lib/prisma')

async function listWarehouses(req, res) {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' }
    })
    res.json(warehouses)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function createWarehouse(req, res) {
  try {
    const { name, location } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        location: location || null,
        is_active: true,
        createdAt: new Date()
      }
    })
    res.status(201).json(warehouse)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function updateWarehouse(req, res) {
  try {
    const id = parseInt(req.params.id)
    const { name, location, is_active } = req.body
    const data = {}
    if (name !== undefined) data.name = name
    if (location !== undefined) data.location = location
    if (is_active !== undefined) data.is_active = is_active

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data
    })
    res.json(warehouse)
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Warehouse not found' })
    res.status(500).json({ error: e.message })
  }
}

async function list(req, res) {
  try {
    const { warehouse_id } = req.query
    const where = {}
    if (warehouse_id) where.warehouse_id = parseInt(warehouse_id)

    const records = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            price: true,
            cost: true,
            category: { select: { id: true, name: true } }
          }
        },
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: [{ warehouse_id: 'asc' }, { product_id: 'asc' }]
    })

    const result = records.map(inv => ({
      ...inv,
      is_low_stock: inv.quantity <= inv.min_quantity
    }))
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function adjustStock(req, res) {
  try {
    const { product_id, warehouse_id, quantity_change, reason } = req.body
    if (product_id === undefined || warehouse_id === undefined || quantity_change === undefined) {
      return res.status(400).json({ error: 'product_id, warehouse_id, and quantity_change are required' })
    }

    const pid = parseInt(product_id)
    const wid = parseInt(warehouse_id)
    const delta = parseInt(quantity_change)

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: { product_id_warehouse_id: { product_id: pid, warehouse_id: wid } }
      })

      const currentQty = existing ? existing.quantity : 0
      const newQty = currentQty + delta

      if (newQty < 0) {
        throw Object.assign(new Error('Insufficient stock: resulting quantity would be negative'), { statusCode: 400 })
      }

      const inventory = await tx.inventory.upsert({
        where: { product_id_warehouse_id: { product_id: pid, warehouse_id: wid } },
        create: {
          product_id: pid,
          warehouse_id: wid,
          quantity: newQty,
          min_quantity: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        update: {
          quantity: newQty,
          updatedAt: new Date()
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true } }
        }
      })

      return inventory
    })

    res.json({ success: true, inventory: result, reason: reason || null })
  } catch (e) {
    if (e.statusCode === 400) return res.status(400).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
}

async function transferStock(req, res) {
  try {
    const { product_id, from_warehouse_id, to_warehouse_id, quantity } = req.body
    if (product_id === undefined || from_warehouse_id === undefined || to_warehouse_id === undefined || quantity === undefined) {
      return res.status(400).json({ error: 'product_id, from_warehouse_id, to_warehouse_id, and quantity are required' })
    }

    const pid = parseInt(product_id)
    const fromWid = parseInt(from_warehouse_id)
    const toWid = parseInt(to_warehouse_id)
    const qty = parseInt(quantity)

    if (qty <= 0) return res.status(400).json({ error: 'quantity must be positive' })
    if (fromWid === toWid) return res.status(400).json({ error: 'from_warehouse_id and to_warehouse_id must be different' })

    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.inventory.findUnique({
        where: { product_id_warehouse_id: { product_id: pid, warehouse_id: fromWid } }
      })

      const sourceQty = source ? source.quantity : 0
      if (sourceQty < qty) {
        throw Object.assign(
          new Error(`Insufficient stock in source warehouse: available ${sourceQty}, requested ${qty}`),
          { statusCode: 400 }
        )
      }

      const updatedSource = await tx.inventory.update({
        where: { product_id_warehouse_id: { product_id: pid, warehouse_id: fromWid } },
        data: { quantity: sourceQty - qty, updatedAt: new Date() },
        include: { warehouse: { select: { id: true, name: true } } }
      })

      const dest = await tx.inventory.findUnique({
        where: { product_id_warehouse_id: { product_id: pid, warehouse_id: toWid } }
      })

      const destQty = dest ? dest.quantity : 0
      const updatedDest = await tx.inventory.upsert({
        where: { product_id_warehouse_id: { product_id: pid, warehouse_id: toWid } },
        create: {
          product_id: pid,
          warehouse_id: toWid,
          quantity: qty,
          min_quantity: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        update: {
          quantity: destQty + qty,
          updatedAt: new Date()
        },
        include: { warehouse: { select: { id: true, name: true } } }
      })

      return { source: updatedSource, destination: updatedDest }
    })

    res.json({ success: true, transfer: { product_id: pid, quantity: qty, ...result } })
  } catch (e) {
    if (e.statusCode === 400) return res.status(400).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
}

async function lowStockAlerts(req, res) {
  try {
    const records = await prisma.inventory.findMany({
      where: {
        quantity: { lte: prisma.inventory.fields.min_quantity }
      },
      include: {
        product: { select: { id: true, name: true, sku: true, barcode: true } },
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: [{ quantity: 'asc' }]
    })
    const result = records.map(inv => ({ ...inv, is_low_stock: true }))
    res.json(result)
  } catch (e) {
    // Fallback: fetch all and filter in JS if Prisma field reference fails
    try {
      const all = await prisma.inventory.findMany({
        include: {
          product: { select: { id: true, name: true, sku: true, barcode: true } },
          warehouse: { select: { id: true, name: true } }
        }
      })
      const alerts = all
        .filter(inv => inv.quantity <= inv.min_quantity)
        .map(inv => ({ ...inv, is_low_stock: true }))
        .sort((a, b) => a.quantity - b.quantity)
      res.json(alerts)
    } catch (e2) {
      res.status(500).json({ error: e2.message })
    }
  }
}

module.exports = { listWarehouses, createWarehouse, updateWarehouse, list, adjustStock, transferStock, lowStockAlerts }
