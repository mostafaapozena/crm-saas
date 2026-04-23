const prisma = require('../lib/prisma');

const getCEODashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);

    const [
      // CRM
      totalLeads, monthLeads, wonDeals, activeDeals,
      totalClients,
      // Finance
      totalRevenue, monthRevenue, yearRevenue,
      totalExpenses, monthExpenses,
      outstandingInvoices,
      // Operations
      activeProjects, completedProjects,
      overdueTasks, doneTasks, totalTasks,
      // Marketing
      activeCampaigns, campaignMetricsTotals,
      // Team
      totalUsers, activeUsers,
      // Recent activity
      recentActivity,
      // Top deals
      topDeals,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.deal.aggregate({ _count: true, _sum: { value: true }, where: { status: 'WON' } }),
      prisma.deal.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count(),

      prisma.payment.aggregate({ _sum: { amount_paid: true } }),
      prisma.payment.aggregate({ _sum: { amount_paid: true }, where: { payment_date: { gte: startOfMonth } } }),
      prisma.payment.aggregate({ _sum: { amount_paid: true }, where: { payment_date: { gte: startOfYear } } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
      prisma.invoice.aggregate({ _sum: { total_amount: true }, where: { status: { in: ['SENT', 'OVERDUE'] } } }),

      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: { not: 'DONE' }, due_date: { lt: now } } }),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.task.count(),

      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      prisma.campaignMetric.aggregate({ _sum: { revenue: true, spend: true, conversions: true } }),

      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),

      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } },
      }),

      prisma.deal.findMany({
        where: { status: 'ACTIVE' },
        include: { lead: { select: { name: true } }, client: { select: { name: true } } },
        orderBy: { value: 'desc' },
        take: 5,
      }),
    ]);

    const revenue = parseFloat(totalRevenue._sum.amount_paid || 0);
    const expenses = parseFloat(totalExpenses._sum.amount || 0);
    const campaignROI = parseFloat(campaignMetricsTotals._sum.spend || 0) > 0
      ? Math.round(((parseFloat(campaignMetricsTotals._sum.revenue || 0) - parseFloat(campaignMetricsTotals._sum.spend || 0)) / parseFloat(campaignMetricsTotals._sum.spend || 1)) * 100)
      : 0;

    res.json({
      kpis: {
        // Revenue
        totalRevenue: revenue,
        monthRevenue: parseFloat(monthRevenue._sum.amount_paid || 0),
        yearRevenue: parseFloat(yearRevenue._sum.amount_paid || 0),
        netProfit: revenue - expenses,
        profitMargin: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0,
        totalExpenses: expenses,
        monthExpenses: parseFloat(monthExpenses._sum.amount || 0),
        outstandingAmount: parseFloat(outstandingInvoices._sum.total_amount || 0),
        // CRM
        totalLeads, monthLeads,
        wonDealsCount: wonDeals._count,
        wonDealsValue: parseFloat(wonDeals._sum.value || 0),
        activeDeals, totalClients,
        winRate: (wonDeals._count + activeDeals) > 0
          ? Math.round((wonDeals._count / (wonDeals._count + activeDeals)) * 100)
          : 0,
        // Projects
        activeProjects, completedProjects,
        taskCompletionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        overdueTasks,
        // Marketing
        activeCampaigns,
        campaignROI,
        totalConversions: campaignMetricsTotals._sum.conversions || 0,
        // Team
        totalUsers, activeUsers,
      },
      recentActivity,
      topDeals,
    });
  } catch (err) { next(err); }
};

module.exports = { getCEODashboard };
