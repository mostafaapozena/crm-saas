'use strict';

const prisma = require('../lib/prisma');
const { computeROI, computeCPA } = require('../lib/roi');

const getMarketingSummary = async (req, res, next) => {
  try {
    const [
      totalCampaigns,
      activeCampaigns,
      budgetAgg,
      metricsAgg,
      metaCampaigns,
      googleCampaigns,
      recentCampaigns,
      dealRevenueFromLeads,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),

      prisma.campaign.aggregate({ _sum: { budget: true, spent: true } }),

      prisma.campaignMetric.aggregate({
        _sum: { spend: true, revenue: true, impressions: true, clicks: true, conversions: true },
      }),

      // Per-platform metrics aggregated for best-platform detection
      prisma.campaignMetric.groupBy({
        by: ['campaign_id'],
        _sum: { spend: true, revenue: true, conversions: true },
        where: {
          campaign: { platform: 'META' },
        },
      }),

      prisma.campaignMetric.groupBy({
        by: ['campaign_id'],
        _sum: { spend: true, revenue: true, conversions: true },
        where: {
          campaign: { platform: 'GOOGLE' },
        },
      }),

      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          _count: { select: { metrics: true, leads: true } },
        },
      }),

      // Revenue from WON deals linked to campaign leads
      prisma.deal.aggregate({
        where: { lead: { campaign_id: { not: null } }, status: 'WON' },
        _sum: { value: true },
      }),
    ]);

    const totalBudget = parseFloat(budgetAgg._sum.budget || 0);
    const totalSpent = parseFloat(budgetAgg._sum.spent || 0);
    const metricSpend = parseFloat(metricsAgg._sum.spend || 0);
    const metricRevenue = parseFloat(metricsAgg._sum.revenue || 0);
    const dealRevenue = parseFloat(dealRevenueFromLeads._sum.value || 0);
    const totalRevenue = metricRevenue + dealRevenue;
    const totalConversions = parseInt(metricsAgg._sum.conversions || 0);
    const totalImpressions = parseInt(metricsAgg._sum.impressions || 0);
    const totalClicks = parseInt(metricsAgg._sum.clicks || 0);
    const overallROI = computeROI(totalRevenue, metricSpend);
    const overallCPA = computeCPA(metricSpend, totalConversions);

    // Best platform by ROI
    const metaSpend = metaCampaigns.reduce((s, m) => s + parseFloat(m._sum.spend || 0), 0);
    const metaRevenue = metaCampaigns.reduce((s, m) => s + parseFloat(m._sum.revenue || 0), 0);
    const googleSpend = googleCampaigns.reduce((s, m) => s + parseFloat(m._sum.spend || 0), 0);
    const googleRevenue = googleCampaigns.reduce((s, m) => s + parseFloat(m._sum.revenue || 0), 0);
    const metaROI = computeROI(metaRevenue, metaSpend);
    const googleROI = computeROI(googleRevenue, googleSpend);
    const bestPlatform = metaROI >= googleROI ? 'META' : 'GOOGLE';

    res.json({
      overview: {
        totalCampaigns,
        activeCampaigns,
        totalBudget,
        totalSpent,
        budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        totalRevenue,
        metricRevenue,
        dealRevenue,
        overallROI,
        overallCPA,
        totalConversions,
        totalImpressions,
        totalClicks,
        bestPlatform,
      },
      platforms: {
        META: { spend: metaSpend, revenue: metaRevenue, roi: metaROI, campaigns: metaCampaigns.length },
        GOOGLE: { spend: googleSpend, revenue: googleRevenue, roi: googleROI, campaigns: googleCampaigns.length },
      },
      recentCampaigns,
    });
  } catch (err) { next(err); }
};

module.exports = { getMarketingSummary };
