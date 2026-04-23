const prisma = require('../lib/prisma');
const FinanceEngine = require('../lib/finance-engine');

const getAll = async (req, res) => {
  try {
    const { period } = req.query;
    const where = period ? { period } : {};
    const entries = await prisma.cogsEntry.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const total = entries.reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ entries, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const syncFromPurchases = async (req, res) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: 'Period is required (YYYY-MM)' });

    const { start, end } = FinanceEngine.getPeriodRange(period);
    const purchases = await prisma.stockPurchase.findMany({
      where: { received_at: { gte: start, lt: end }, status: 'RECEIVED' },
      include: { items: { include: { product: true } } },
    });

    const created = [];
    for (const purchase of purchases) {
      const exists = await prisma.cogsEntry.findFirst({
        where: { source: 'STOCK_PURCHASE', source_id: purchase.id },
      });
      if (exists) continue;

      for (const item of purchase.items) {
        const entry = await prisma.cogsEntry.create({
          data: {
            period,
            source: 'STOCK_PURCHASE',
            source_id: purchase.id,
            product_id: item.product_id,
            description: `${purchase.purchase_number} — ${item.product.name}`,
            amount: parseFloat(item.cost) * item.quantity,
          },
        });
        created.push(entry);
      }
    }

    res.json({ synced: created.length, entries: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createManual = async (req, res) => {
  try {
    const { period, description, amount, product_id, notes } = req.body;
    if (!period || !description || !amount)
      return res.status(400).json({ error: 'Period, description and amount are required' });
    const entry = await prisma.cogsEntry.create({
      data: {
        period,
        source: 'MANUAL',
        description,
        amount: parseFloat(amount),
        product_id: product_id ? parseInt(product_id) : null,
        notes,
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.cogsEntry.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, syncFromPurchases, createManual, remove };
