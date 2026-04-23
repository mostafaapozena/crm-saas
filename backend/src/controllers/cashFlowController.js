const prisma = require('../lib/prisma');
const FinanceEngine = require('../lib/finance-engine');

const getCashFlow = async (req, res) => {
  try {
    const period = req.query.period || FinanceEngine.getPeriod();
    const flow = await FinanceEngine.calcCashFlow(period);
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTrend = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const now = new Date();
    const periods = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return FinanceEngine.getPeriod(d);
    });
    const results = await Promise.all(periods.map(p => FinanceEngine.calcCashFlow(p)));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEntries = async (req, res) => {
  try {
    const { period, type } = req.query;
    const where = {};
    if (period) where.period = period;
    if (type) where.type = type;
    const entries = await prisma.cashFlowEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEntry = async (req, res) => {
  try {
    const { date, type, source, amount, description, account, period } = req.body;
    if (!type || !amount || !description || !period)
      return res.status(400).json({ error: 'Type, amount, description and period are required' });
    const entry = await prisma.cashFlowEntry.create({
      data: {
        date: date ? new Date(date) : new Date(),
        type,
        source: source || 'MANUAL',
        amount: parseFloat(amount),
        description,
        account: account || 'BANK',
        period,
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.cashFlowEntry.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getCashFlow, getTrend, getEntries, createEntry, remove };
