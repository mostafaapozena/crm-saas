const prisma = require('../lib/prisma')

async function listCategories(req, res) {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' }
    })
    res.json(categories)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function createCategory(req, res) {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const category = await prisma.productCategory.create({
      data: { name, createdAt: new Date() }
    })
    res.status(201).json(category)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function list(req, res) {
  try {
    const { search, category_id } = req.query
    const where = { is_active: true }
    if (category_id) where.category_id = parseInt(category_id)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ]
    }
    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        inventory: {
          include: {
            warehouse: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    const result = products.map(p => ({
      ...p,
      inventory_total: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
    }))
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function get(req, res) {
  try {
    const id = parseInt(req.params.id)
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        inventory: {
          include: {
            warehouse: { select: { id: true, name: true } }
          }
        }
      }
    })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json({
      ...product,
      inventory_total: product.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function create(req, res) {
  try {
    const { name, sku, barcode, price, cost, category_id } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku || null,
        barcode: barcode || null,
        price: price !== undefined ? price : 0,
        cost: cost !== undefined ? cost : 0,
        category_id: category_id ? parseInt(category_id) : null,
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    const firstWarehouse = await prisma.warehouse.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' }
    })
    if (firstWarehouse) {
      await prisma.inventory.create({
        data: {
          product_id: product.id,
          warehouse_id: firstWarehouse.id,
          quantity: 0,
          min_quantity: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    const full = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: { select: { id: true, name: true } },
        inventory: { include: { warehouse: { select: { id: true, name: true } } } }
      }
    })
    res.status(201).json(full)
  } catch (e) {
    if (e.code === 'P2002') {
      const field = e.meta && e.meta.target ? e.meta.target.join(', ') : 'sku or barcode'
      return res.status(400).json({ error: `Duplicate value for ${field}` })
    }
    res.status(500).json({ error: e.message })
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id)
    const { name, sku, barcode, price, cost, category_id, is_active } = req.body
    const data = { updatedAt: new Date() }
    if (name !== undefined) data.name = name
    if (sku !== undefined) data.sku = sku
    if (barcode !== undefined) data.barcode = barcode
    if (price !== undefined) data.price = price
    if (cost !== undefined) data.cost = cost
    if (category_id !== undefined) data.category_id = category_id ? parseInt(category_id) : null
    if (is_active !== undefined) data.is_active = is_active

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        inventory: { include: { warehouse: { select: { id: true, name: true } } } }
      }
    })
    res.json(product)
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Product not found' })
    if (e.code === 'P2002') {
      const field = e.meta && e.meta.target ? e.meta.target.join(', ') : 'sku or barcode'
      return res.status(400).json({ error: `Duplicate value for ${field}` })
    }
    res.status(500).json({ error: e.message })
  }
}

async function softDelete(req, res) {
  try {
    const id = parseInt(req.params.id)
    const product = await prisma.product.update({
      where: { id },
      data: { is_active: false, updatedAt: new Date() }
    })
    res.json({ success: true, product })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Product not found' })
    res.status(500).json({ error: e.message })
  }
}

module.exports = { listCategories, createCategory, list, get, create, update, softDelete }
