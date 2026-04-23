const FinanceEngine = require('../lib/finance-engine');

const getPnL = async (req, res) => {
  try {
    const period = req.query.period || FinanceEngine.getPeriod();
    const pnl = await FinanceEngine.calcPnL(period);
    res.json(pnl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getComparison = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const now = new Date();
    const periods = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return FinanceEngine.getPeriod(d);
    });
    const results = await Promise.all(periods.map(p => FinanceEngine.calcPnL(p)));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPnL, getComparison };
