const prisma = require('../lib/prisma');

const getSummary = async (req, res, next) => {
  try {
    const [
      totalLeads,
      totalClients,
      totalDeals,
      wonDeals,
      activeDeals,
      lostDeals,
      leadsThisMonth,
      recentLeads,
      revenueData,
      leadsByStage,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.client.count(),
      prisma.deal.count(),
      prisma.deal.aggregate({ _count: true, _sum: { value: true }, where: { status: 'WON' } }),
      prisma.deal.count({ where: { status: 'ACTIVE' } }),
      prisma.deal.count({ where: { status: 'LOST' } }),
      prisma.lead.count({
        where: { createdAt: { gte: new Date(new Date().setDate(1)) } },
      }),
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { name: true } } },
      }),
      prisma.deal.aggregate({
        _sum: { value: true },
        where: { status: { in: ['ACTIVE', 'WON'] } },
      }),
      prisma.lead.groupBy({
        by: ['stage'],
        _count: { id: true },
        _sum: { deal_value: true },
      }),
    ]);

    const wonRate = totalDeals > 0 ? Math.round((wonDeals._count / totalDeals) * 100) : 0;

    res.json({
      overview: {
        totalLeads,
        totalClients,
        totalDeals,
        activeDeals,
        lostDeals,
        leadsThisMonth,
        wonRate,
      },
      revenue: {
        totalPipeline: parseFloat(revenueData._sum.value || 0),
        wonRevenue: parseFloat(wonDeals._sum.value || 0),
        wonDealsCount: wonDeals._count,
      },
      leadsByStage: leadsByStage.map((s) => ({
        stage: s.stage,
        count: s._count.id,
        value: parseFloat(s._sum.deal_value || 0),
      })),
      recentLeads,
    });
  } catch (err) { next(err); }
};

module.exports = { getSummary };
