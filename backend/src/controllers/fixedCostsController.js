const prisma = require('../lib/prisma');

const getAll = async (req, res) => {
  try {
    const { period } = req.query;
    const where = period ? { period } : {};
    const costs = await prisma.fixedCost.findMany({
      where,
      include: { businessUnit: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const total = costs.reduce((s, c) => s + parseFloat(c.amount), 0);
    res.json({ costs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { title, category, amount, business_unit_id, recurrence, period, notes } = req.body;
    if (!title || !amount || !period) return res.status(400).json({ error: 'Title, amount and period are required' });
    const cost = await prisma.fixedCost.create({
      data: {
        title,
        category: category || 'OVERHEAD',
        amount: parseFloat(amount),
        business_unit_id: business_unit_id ? parseInt(business_unit_id) : null,
        recurrence: recurrence || 'MONTHLY',
        period,
        notes,
      },
      include: { businessUnit: { select: { id: true, name: true } } },
    });
    res.status(201).json(cost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { title, category, amount, business_unit_id, recurrence, period, notes } = req.body;
    const cost = await prisma.fixedCost.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title,
        category,
        amount: amount ? parseFloat(amount) : undefined,
        business_unit_id: business_unit_id ? parseInt(business_unit_id) : null,
        recurrence,
        period,
        notes,
      },
      include: { businessUnit: { select: { id: true, name: true } } },
    });
    res.json(cost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.fixedCost.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, create, update, remove };
