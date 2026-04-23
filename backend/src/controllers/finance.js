const prisma = require('../lib/prisma');

// GET /finance/summary
const getFinanceSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalRevenue,
      monthRevenue,
      yearRevenue,
      totalExpenses,
      monthExpenses,
      outstandingInvoices,
      overdueInvoices,
      paidInvoices,
      draftInvoices,
      recentPayments,
      expenseByCategory,
      topClients,
      monthlyRevenue,
    ] = await Promise.all([
      // Revenue = all payments
      prisma.payment.aggregate({ _sum: { amount_paid: true } }),
      prisma.payment.aggregate({ _sum: { amount_paid: true }, where: { payment_date: { gte: startOfMonth } } }),
      prisma.payment.aggregate({ _sum: { amount_paid: true }, where: { payment_date: { gte: startOfYear } } }),
      // Expenses
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
      // Invoices by status
      prisma.invoice.aggregate({ _sum: { total_amount: true }, where: { status: { in: ['SENT', 'OVERDUE'] } } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'DRAFT' } }),
      // Recent payments
      prisma.payment.findMany({
        take: 5, orderBy: { payment_date: 'desc' },
        include: { invoice: { include: { client: { select: { name: true, company: true } } } } },
      }),
      // Expenses by category
      prisma.expense.groupBy({ by: ['category'], _sum: { amount: true }, _count: { id: true } }),
      // Top clients by revenue
      prisma.invoice.groupBy({
        by: ['client_id'], where: { status: 'PAID' },
        _sum: { total_amount: true }, _count: { id: true },
        orderBy: { _sum: { total_amount: 'desc' } }, take: 5,
      }),
      // Monthly revenue for chart (last 6 months) — SQLite-compatible
      prisma.$queryRaw`
        SELECT
          strftime('%Y-%m', payment_date) as month,
          SUM(CAST(amount_paid AS REAL)) as revenue,
          COUNT(id) as count
        FROM payments
        WHERE payment_date >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', payment_date)
        ORDER BY month ASC
      `,
    ]);

    const totalRev = parseFloat(totalRevenue._sum.amount_paid || 0);
    const totalExp = parseFloat(totalExpenses._sum.amount || 0);

    // Enrich top clients with names
    const clientIds = topClients.map(c => c.client_id);
    const clientDetails = await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true, company: true } });
    const clientMap = Object.fromEntries(clientDetails.map(c => [c.id, c]));

    res.json({
      summary: {
        totalRevenue: totalRev,
        monthRevenue: parseFloat(monthRevenue._sum.amount_paid || 0),
        yearRevenue: parseFloat(yearRevenue._sum.amount_paid || 0),
        totalExpenses: totalExp,
        monthExpenses: parseFloat(monthExpenses._sum.amount || 0),
        netProfit: totalRev - totalExp,
        profitMargin: totalRev > 0 ? Math.round(((totalRev - totalExp) / totalRev) * 100) : 0,
        outstandingAmount: parseFloat(outstandingInvoices._sum.total_amount || 0),
        overdueInvoices,
        paidInvoices,
        draftInvoices,
      },
      recentPayments,
      expenseByCategory: expenseByCategory.map(e => ({
        category: e.category,
        total: parseFloat(e._sum.amount || 0),
        count: e._count.id,
      })),
      topClients: topClients.map(c => ({
        ...clientMap[c.client_id],
        revenue: parseFloat(c._sum.total_amount || 0),
        invoices: c._count.id,
      })),
      monthlyRevenue: (monthlyRevenue || []).map(r => ({
        month: r.month,
        revenue: parseFloat(r.revenue || 0),
        count: Number(r.count || 0),
      })),
    });
  } catch (err) { next(err); }
};

// GET /finance/project-profit/:project_id
const getProjectProfit = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.project_id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, name: true, company: true } },
        invoices: {
          include: { payments: true },
        },
        expenses: true,
        _count: { select: { tasks: true } },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const totalRevenue = project.invoices
      .flatMap(inv => inv.payments)
      .reduce((s, p) => s + parseFloat(p.amount_paid), 0);

    const totalExpenses = project.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalInvoiced = project.invoices.reduce((s, inv) => s + parseFloat(inv.total_amount), 0);
    const paidInvoices = project.invoices.filter(i => i.status === 'PAID').length;
    const pendingInvoices = project.invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).length;

    res.json({
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        budget: parseFloat(project.budget || 0),
        client: project.client,
      },
      financials: {
        totalInvoiced,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
        budgetUsed: project.budget ? Math.round((totalExpenses / parseFloat(project.budget)) * 100) : 0,
        paidInvoices,
        pendingInvoices,
        totalInvoices: project.invoices.length,
        totalTasks: project._count.tasks,
      },
      invoices: project.invoices,
      expenses: project.expenses,
    });
  } catch (err) { next(err); }
};

// GET /reports/revenue
const getRevenueReport = async (req, res, next) => {
  try {
    const { from, to, group = 'month' } = req.query;
    const where = {};
    if (from || to) {
      where.payment_date = {};
      if (from) where.payment_date.gte = new Date(from);
      if (to) where.payment_date.lte = new Date(to);
    }

    const payments = await prisma.payment.findMany({
      where, orderBy: { payment_date: 'asc' },
      include: { invoice: { include: { client: { select: { name: true, company: true } }, project: { select: { title: true } } } } },
    });

    const total = payments.reduce((s, p) => s + parseFloat(p.amount_paid), 0);

    res.json({ total, count: payments.length, payments });
  } catch (err) { next(err); }
};

// GET /reports/expenses
const getExpensesReport = async (req, res, next) => {
  try {
    const { from, to, category } = req.query;
    const where = {};
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [expenses, byCategory, byProject] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { date: 'desc' }, include: { project: { select: { title: true } }, creator: { select: { name: true } } } }),
      prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, _count: { id: true } }),
      prisma.expense.groupBy({ by: ['project_id'], where: { ...where, project_id: { not: null } }, _sum: { amount: true } }),
    ]);

    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ total, count: expenses.length, expenses, byCategory, byProject });
  } catch (err) { next(err); }
};

// GET /reports/profit
const getProfitReport = async (req, res, next) => {
  try {
    const [revenueResult, expenseResult] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount_paid: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    const revenue = parseFloat(revenueResult._sum.amount_paid || 0);
    const expenses = parseFloat(expenseResult._sum.amount || 0);

    const projectProfits = await prisma.project.findMany({
      where: { status: { not: 'PLANNING' } },
      select: {
        id: true, title: true, budget: true, status: true,
        invoices: { include: { payments: true } },
        expenses: { select: { amount: true } },
        client: { select: { name: true, company: true } },
      },
    });

    const projectProfitData = projectProfits.map(p => {
      const rev = p.invoices.flatMap(i => i.payments).reduce((s, pay) => s + parseFloat(pay.amount_paid), 0);
      const exp = p.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
      return {
        id: p.id, title: p.title, status: p.status,
        client: p.client,
        budget: parseFloat(p.budget || 0),
        revenue: rev, expenses: exp,
        profit: rev - exp,
        margin: rev > 0 ? Math.round(((rev - exp) / rev) * 100) : 0,
      };
    }).sort((a, b) => b.profit - a.profit);

    res.json({
      global: { revenue, expenses, profit: revenue - expenses, margin: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0 },
      byProject: projectProfitData,
    });
  } catch (err) { next(err); }
};

module.exports = { getFinanceSummary, getProjectProfit, getRevenueReport, getExpensesReport, getProfitReport };
