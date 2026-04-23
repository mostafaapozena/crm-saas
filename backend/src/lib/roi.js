'use strict';

const prisma = require('./prisma');

// ROI = (Revenue - Ad Spend) / Ad Spend * 100
function computeROI(revenue, spend) {
  if (spend <= 0) return 0;
  return Math.round(((revenue - spend) / spend) * 100);
}

function computeCTR(clicks, impressions) {
  if (impressions <= 0) return 0;
  return parseFloat(((clicks / impressions) * 100).toFixed(2));
}

function computeCPC(spend, clicks) {
  if (clicks <= 0) return 0;
  return parseFloat((spend / clicks).toFixed(2));
}

function computeCPA(spend, conversions) {
  if (conversions <= 0) return 0;
  return parseFloat((spend / conversions).toFixed(2));
}

// Full ROI for a campaign: metrics revenue + WON deals from linked leads + project payments
async function getCampaignROI(campaignId) {
  const id = parseInt(campaignId);

  const [metricsAgg, dealsFromLeads, projectPayments] = await Promise.all([
    prisma.campaignMetric.aggregate({
      where: { campaign_id: id },
      _sum: { spend: true, revenue: true, impressions: true, clicks: true, conversions: true },
    }),

    // Deals WON from leads that came from this campaign
    prisma.deal.aggregate({
      where: {
        lead: { campaign_id: id },
        status: 'WON',
      },
      _sum: { value: true },
    }),

    // Payments on invoices tied to the campaign's project (joined via campaign record)
    prisma.campaign.findUnique({
      where: { id },
      select: {
        spent: true,
        project_id: true,
        project: {
          select: {
            invoices: {
              select: { payments: { select: { amount_paid: true } } },
            },
          },
        },
      },
    }),
  ]);

  const metricSpend = parseFloat(metricsAgg._sum.spend || 0);
  const metricRevenue = parseFloat(metricsAgg._sum.revenue || 0);
  const dealRevenue = parseFloat(dealsFromLeads._sum.value || 0);

  let projectRevenue = 0;
  if (projectPayments?.project?.invoices) {
    projectRevenue = projectPayments.project.invoices.reduce((sum, inv) => {
      return sum + inv.payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
    }, 0);
  }

  const totalRevenue = metricRevenue + dealRevenue + projectRevenue;
  const totalSpend = metricSpend;
  const totalImpressions = parseInt(metricsAgg._sum.impressions || 0);
  const totalClicks = parseInt(metricsAgg._sum.clicks || 0);
  const totalConversions = parseInt(metricsAgg._sum.conversions || 0);

  return {
    totalSpend,
    totalRevenue,
    metricRevenue,
    dealRevenue,
    projectRevenue,
    roi: computeROI(totalRevenue, totalSpend),
    ctr: computeCTR(totalClicks, totalImpressions),
    cpc: computeCPC(totalSpend, totalClicks),
    cpa: computeCPA(totalSpend, totalConversions),
    totalImpressions,
    totalClicks,
    totalConversions,
  };
}

module.exports = { computeROI, computeCTR, computeCPC, computeCPA, getCampaignROI };
