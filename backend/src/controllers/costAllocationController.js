const prisma = require('../lib/prisma');
const FinanceEngine = require('../lib/finance-engine');

const getRules = async (req, res) => {
  try {
    const rules = await prisma.costAllocationRule.findMany({
      include: { businessUnit: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createRule = async (req, res) => {
  try {
    const { name, source_category, business_unit_id, allocation_type, value } = req.body;
    if (!name || !business_unit_id || value === undefined)
      return res.status(400).json({ error: 'Name, business unit and value are required' });
    const rule = await prisma.costAllocationRule.create({
      data: {
        name,
        source_category: source_category || 'ALL',
        business_unit_id: parseInt(business_unit_id),
        allocation_type: allocation_type || 'PERCENTAGE',
        value: parseFloat(value),
      },
      include: { businessUnit: { select: { id: true, name: true } } },
    });
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateRule = async (req, res) => {
  try {
    const rule = await prisma.costAllocationRule.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: { businessUnit: { select: { id: true, name: true } } },
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const runAllocation = async (req, res) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: 'Period is required (YYYY-MM)' });

    const { start, end } = FinanceEngine.getPeriodRange(period);
    const rules = await prisma.costAllocationRule.findMany({ where: { is_active: true } });

    const expenses = await prisma.expense.findMany({ where: { createdAt: { gte: start, lt: end } } });
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    const entries = [];
    for (const rule of rules) {
      const allocated =
        rule.allocation_type === 'PERCENTAGE'
          ? (totalExpenses * parseFloat(rule.value)) / 100
          : parseFloat(rule.value);

      const entry = await prisma.costAllocationEntry.create({
        data: {
          rule_id: rule.id,
          business_unit_id: rule.business_unit_id,
          period,
          allocated_amount: allocated,
          notes: `Auto-allocated from ${rule.source_category} expenses`,
        },
      });
      entries.push(entry);
    }

    res.json({ success: true, allocations: entries.length, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEntries = async (req, res) => {
  try {
    const { period } = req.query;
    const where = period ? { period } : {};
    const entries = await prisma.costAllocationEntry.findMany({
      where,
      include: {
        rule: { select: { name: true, source_category: true, allocation_type: true, value: true } },
        businessUnit: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getRules, createRule, updateRule, runAllocation, getEntries };
