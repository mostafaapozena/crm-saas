const prisma = require('../lib/prisma')

const ALLOWED_STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']

exports.list = async (req, res) => {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = status

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        sale: {
          select: { sale_number: true, total: true }
        },
        driver: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(deliveries)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.get = async (req, res) => {
  try {
    const { id } = req.params

    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(id) },
      include: {
        sale: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        driver: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' })

    res.json(delivery)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { sale_id, address, notes } = req.body

    if (!sale_id) return res.status(400).json({ error: 'sale_id is required' })

    const existing = await prisma.delivery.findUnique({
      where: { sale_id: parseInt(sale_id) }
    })
    if (existing) return res.status(400).json({ error: 'A delivery already exists for this sale' })

    const delivery_number = 'DEL-' + Date.now()

    const delivery = await prisma.delivery.create({
      data: {
        delivery_number,
        sale_id: parseInt(sale_id),
        address: address || null,
        notes: notes || null,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    res.status(201).json(delivery)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes, address } = req.body

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` })
    }

    const existing = await prisma.delivery.findUnique({ where: { id: parseInt(id) } })
    if (!existing) return res.status(404).json({ error: 'Delivery not found' })

    const data = { updatedAt: new Date() }
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes
    if (address !== undefined) data.address = address
    if (status === 'DELIVERED') data.delivered_at = new Date()

    const delivery = await prisma.delivery.update({
      where: { id: parseInt(id) },
      data
    })

    res.json(delivery)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.assignDriver = async (req, res) => {
  try {
    const { id } = req.params
    const { driver_id } = req.body

    if (!driver_id) return res.status(400).json({ error: 'driver_id is required' })

    const existing = await prisma.delivery.findUnique({ where: { id: parseInt(id) } })
    if (!existing) return res.status(404).json({ error: 'Delivery not found' })

    const delivery = await prisma.delivery.update({
      where: { id: parseInt(id) },
      data: {
        driver_id: parseInt(driver_id),
        status: 'ASSIGNED',
        assigned_at: new Date(),
        updatedAt: new Date()
      }
    })

    res.json(delivery)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
