const prisma = require('./prisma');

class FinanceEngine {
  static getPeriod(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  static getPeriodRange(period) {
    const [year, month] = period.split('-').map(Number);
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 1),
    };
  }

  static async calcPnL(period) {
    const { start, end } = this.getPeriodRange(period);

    const [payments, posSales, cogsEntries, expenses, fixedCosts, payroll] = await Promise.all([
      prisma.payment.findMany({ where: { payment_date: { gte: start, lt: end } } }),
      prisma.posSale.findMany({
        where: { createdAt: { gte: start, lt: end }, payment_status: 'PAID' },
        include: { items: true },
      }),
      prisma.cogsEntry.findMany({ where: { period } }),
      prisma.expense.findMany({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.fixedCost.findMany({ where: { period } }),
      prisma.payroll.findMany({ where: { period, status: { in: ['PAID', 'PENDING'] } } }),
    ]);

    const invoiceRevenue = payments.reduce((s, p) => s + parseFloat(p.amount_paid), 0);
    const posRevenue = posSales.reduce((s, sale) => s + parseFloat(sale.total), 0);
    const totalRevenue = invoiceRevenue + posRevenue;

    const cogsFromEntries = cogsEntries.reduce((s, c) => s + parseFloat(c.amount), 0);
    const cogsFromPOS = posSales.reduce(
      (s, sale) => s + sale.items.reduce((is, item) => is + parseFloat(item.cost) * item.quantity, 0),
      0
    );
    const totalCOGS = cogsFromEntries + cogsFromPOS;

    const grossProfit = totalRevenue - totalCOGS;

    const operatingExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const fixedCostsTotal = fixedCosts.reduce((s, f) => s + parseFloat(f.amount), 0);
    const payrollTotal = payroll.reduce((s, p) => s + parseFloat(p.net_salary), 0);
    const totalExpenses = operatingExpenses + fixedCostsTotal + payrollTotal;

    const netProfit = grossProfit - totalExpenses;

    return {
      period,
      revenue: { invoice: invoiceRevenue, pos: posRevenue, total: totalRevenue },
      cogs: { entries: cogsFromEntries, posItems: cogsFromPOS, total: totalCOGS },
      grossProfit,
      grossMargin: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0,
      expenses: { operating: operatingExpenses, fixed: fixedCostsTotal, payroll: payrollTotal, total: totalExpenses },
      netProfit,
      netMargin: totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(2)) : 0,
    };
  }

  static async calcCashFlow(period) {
    const { start, end } = this.getPeriodRange(period);

    const [payments, posSales, expenses, payroll, purchases, fixedCosts, manual] = await Promise.all([
      prisma.payment.findMany({ where: { payment_date: { gte: start, lt: end } } }),
      prisma.posSale.findMany({ where: { createdAt: { gte: start, lt: end }, payment_status: 'PAID' } }),
      prisma.expense.findMany({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.payroll.findMany({ where: { period, status: 'PAID' } }),
      prisma.stockPurchase.findMany({ where: { received_at: { gte: start, lt: end }, status: 'RECEIVED' } }),
      prisma.fixedCost.findMany({ where: { period } }),
      prisma.cashFlowEntry.findMany({ where: { period } }),
    ]);

    const paymentIn = payments.reduce((s, p) => s + parseFloat(p.amount_paid), 0);
    const posIn = posSales.reduce((s, s2) => s + parseFloat(s2.total), 0);
    const manualIn = manual.filter(m => m.type === 'INFLOW').reduce((s, m) => s + parseFloat(m.amount), 0);

    const expenseOut = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const payrollOut = payroll.reduce((s, p) => s + parseFloat(p.net_salary), 0);
    const purchaseOut = purchases.reduce((s, p) => s + parseFloat(p.total), 0);
    const fixedOut = fixedCosts.reduce((s, f) => s + parseFloat(f.amount), 0);
    const manualOut = manual.filter(m => m.type === 'OUTFLOW').reduce((s, m) => s + parseFloat(m.amount), 0);

    const totalIn = paymentIn + posIn + manualIn;
    const totalOut = expenseOut + payrollOut + purchaseOut + fixedOut + manualOut;

    return {
      period,
      inflows: { payments: paymentIn, pos: posIn, manual: manualIn, total: totalIn },
      outflows: { expenses: expenseOut, payroll: payrollOut, purchases: purchaseOut, fixedCosts: fixedOut, manual: manualOut, total: totalOut },
      netCashFlow: totalIn - totalOut,
    };
  }
}

module.exports = FinanceEngine;
