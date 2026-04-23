'use strict';

const prisma = require('../lib/prisma');
const { getCampaignROI } = require('../lib/roi');

const VALID_TYPES     = ['DIGITAL', 'SOCIAL', 'EMAIL', 'SMS', 'EVENT', 'PRINT', 'OTHER'];
const VALID_STATUSES  = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
const VALID_PLATFORMS = ['META', 'GOOGLE', 'ALL'];

const campaignInclude = {
  creator: { select: { id: true, name: true } },
  client:  { select: { id: true, name: true, company: true } },
  project: { select: { id: true, title: true } },
  _count:  { select: { leads: true, metrics: true, creatives: true } },
};

// ── Create ────────────────────────────────────────────────────────────────────
const createCampaign = async (req, res, next) => {
  try {
    const {
      title, description, type, platform, status, budget, daily_budget,
      start_date, end_date, client_id, project_id, external_id,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: parseInt(client_id) } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const campaign = await prisma.campaign.create({
      data: {
        title,
        description,
        type:         VALID_TYPES.includes(type) ? type : 'DIGITAL',
        platform:     VALID_PLATFORMS.includes(platform) ? platform : 'ALL',
        status:       VALID_STATUSES.includes(status) ? status : 'DRAFT',
        budget:       budget ? parseFloat(budget) : null,
        daily_budget: daily_budget ? parseFloat(daily_budget) : null,
        start_date:   start_date ? new Date(start_date) : null,
        end_date:     end_date ? new Date(end_date) : null,
        external_id:  external_id || null,
        client_id:    parseInt(client_id),
        project_id:   project_id ? parseInt(project_id) : null,
        created_by:   req.user.id,
      },
      include: campaignInclude,
    });

    req.app.get('io')?.emit('campaign:created', campaign);
    res.status(201).json(campaign);
  } catch (err) { next(err); }
};

// ── List ──────────────────────────────────────────────────────────────────────
const getCampaigns = async (req, res, next) => {
  try {
    const { status, type, platform, client_id, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status)    where.status = status;
    if (type)      where.type = type;
    if (platform)  where.platform = platform;
    if (client_id) where.client_id = parseInt(client_id);

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where, skip, take: parseInt(limit),
        include: campaignInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    // Enrich with ROI data from metrics
    const ids = campaigns.map(c => c.id);
    const metricsAgg = ids.length > 0
      ? await prisma.campaignMetric.groupBy({
          by: ['campaign_id'],
          _sum: { spend: true, revenue: true, conversions: true, clicks: true, impressions: true },
          where: { campaign_id: { in: ids } },
        })
      : [];

    const metricsMap = Object.fromEntries(metricsAgg.map(m => [m.campaign_id, m._sum]));

    const enriched = campaigns.map(c => {
      const m = metricsMap[c.id] || { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 };
      const spend   = parseFloat(m.spend || 0);
      const revenue = parseFloat(m.revenue || 0);
      const convs   = parseInt(m.conversions || 0);
      const clicks  = parseInt(m.clicks || 0);
      const roi     = spend > 0 ? Math.round(((revenue - spend) / spend) * 100) : 0;
      const cpa     = convs > 0 ? parseFloat((spend / convs).toFixed(2)) : 0;
      return { ...c, totalSpend: spend, totalRevenue: revenue, totalConversions: convs, totalClicks: clicks, roi, cpa };
    });

    res.json({
      campaigns: enriched,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
};

// ── Detail ────────────────────────────────────────────────────────────────────
const getCampaign = async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        creator:  { select: { id: true, name: true } },
        client:   { select: { id: true, name: true, company: true, email: true } },
        project:  { select: { id: true, title: true, status: true } },
        metrics:  { orderBy: { date: 'asc' } },
        leads:    { select: { id: true, name: true, stage: true, deal_value: true } },
        creatives: { orderBy: { created_at: 'desc' } },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Full ROI (metrics + deals + project payments)
    const analytics = await getCampaignROI(campaign.id);

    res.json({ ...campaign, analytics });
  } catch (err) { next(err); }
};

// ── Update ────────────────────────────────────────────────────────────────────
const updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, description, type, platform, status,
      budget, daily_budget, spent, start_date, end_date,
      client_id, project_id, external_id,
    } = req.body;

    const campaign = await prisma.campaign.update({
      where: { id: parseInt(id) },
      data: {
        ...(title       && { title }),
        ...(description !== undefined && { description }),
        ...(type        && VALID_TYPES.includes(type)     && { type }),
        ...(platform    && VALID_PLATFORMS.includes(platform) && { platform }),
        ...(status      && VALID_STATUSES.includes(status) && { status }),
        ...(budget      !== undefined && { budget: budget ? parseFloat(budget) : null }),
        ...(daily_budget !== undefined && { daily_budget: daily_budget ? parseFloat(daily_budget) : null }),
        ...(spent       !== undefined && { spent: parseFloat(spent) }),
        ...(start_date  !== undefined && { start_date: start_date ? new Date(start_date) : null }),
        ...(end_date    !== undefined && { end_date: end_date ? new Date(end_date) : null }),
        ...(client_id   !== undefined && { client_id: client_id ? parseInt(client_id) : null }),
        ...(project_id  !== undefined && { project_id: project_id ? parseInt(project_id) : null }),
        ...(external_id !== undefined && { external_id: external_id || null }),
      },
      include: campaignInclude,
    });

    req.app.get('io')?.emit('campaign:updated', campaign);
    res.json(campaign);
  } catch (err) { next(err); }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteCampaign = async (req, res, next) => {
  try {
    await prisma.campaign.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Campaign deleted' });
  } catch (err) { next(err); }
};

// ── Add Metrics (manual entry) ────────────────────────────────────────────────
const addMetric = async (req, res, next) => {
  try {
    const { campaign_id, impressions, clicks, conversions, spend, revenue, date } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id is required' });

    const metric = await prisma.campaignMetric.create({
      data: {
        campaign_id:  parseInt(campaign_id),
        impressions:  parseInt(impressions)  || 0,
        clicks:       parseInt(clicks)       || 0,
        conversions:  parseInt(conversions)  || 0,
        spend:        parseFloat(spend)      || 0,
        revenue:      parseFloat(revenue)    || 0,
        date:         date ? new Date(date) : new Date(),
      },
    });

    // Keep campaign.spent in sync
    const agg = await prisma.campaignMetric.aggregate({
      where: { campaign_id: parseInt(campaign_id) },
      _sum: { spend: true },
    });
    await prisma.campaign.update({
      where: { id: parseInt(campaign_id) },
      data: { spent: parseFloat(agg._sum.spend || 0) },
    });

    // Budget alert check
    const camp = await prisma.campaign.findUnique({ where: { id: parseInt(campaign_id) }, select: { budget: true, title: true, spent: true } });
    if (camp?.budget && parseFloat(camp.spent) >= parseFloat(camp.budget)) {
      req.app.get('io')?.emit('campaign:budget_exceeded', {
        campaign_id: parseInt(campaign_id),
        title: camp.title,
        spent: parseFloat(camp.spent),
        budget: parseFloat(camp.budget),
      });
    }

    res.status(201).json(metric);
  } catch (err) { next(err); }
};

module.exports = { createCampaign, getCampaigns, getCampaign, updateCampaign, deleteCampaign, addMetric };
