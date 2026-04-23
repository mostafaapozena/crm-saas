const prisma = require('../lib/prisma');

const getAll = async (req, res) => {
  try {
    const units = await prisma.businessUnit.findMany({
      include: { _count: { select: { fixedCosts: true, allocationRules: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });
    const unit = await prisma.businessUnit.create({
      data: { name, code: code.toUpperCase(), description },
    });
    res.status(201).json(unit);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Unit code already exists' });
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { name, code, description, is_active } = req.body;
    const unit = await prisma.businessUnit.update({
      where: { id: parseInt(req.params.id) },
      data: { name, code: code?.toUpperCase(), description, is_active },
    });
    res.json(unit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.businessUnit.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, create, update, remove };
