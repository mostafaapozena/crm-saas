'use strict';

const prisma = require('../lib/prisma');
const { syncAccountCampaigns } = require('../lib/sync');
const { log } = require('../lib/activityLogger');

// ── List connected accounts ───────────────────────────────────────────────────
const listAccounts = async (req, res, next) => {
  try {
    const accounts = await prisma.marketingAccount.findMany({
      where: { user_id: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        account_id: true,
        account_name: true,
        status: true,
        token_expiry: true,
        last_synced_at: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { campaigns: true } },
      },
    });
    res.json(accounts);
  } catch (err) { next(err); }
};

// ── Disconnect an account ─────────────────────────────────────────────────────
const disconnectAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await prisma.marketingAccount.findFirst({
      where: { id: parseInt(id), user_id: req.user.id },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    await prisma.marketingAccount.update({
      where: { id: parseInt(id) },
      data: { status: 'DISCONNECTED' },
    });

    await log({ user_id: req.user.id, action: 'DELETE', module: 'marketing', entity_id: parseInt(id), entity_type: 'MarketingAccount', description: `Disconnected ${account.platform} account: ${account.account_name}` });
    res.json({ message: 'Account disconnected' });
  } catch (err) { next(err); }
};

// ── Reconnect a disconnected account ─────────────────────────────────────────
const reconnectAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await prisma.marketingAccount.findFirst({
      where: { id: parseInt(id), user_id: req.user.id },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    await prisma.marketingAccount.update({
      where: { id: parseInt(id) },
      data: { status: 'ACTIVE' },
    });
    res.json({ message: 'Account reconnected' });
  } catch (err) { next(err); }
};

// ── Trigger sync for a single account ────────────────────────────────────────
const syncAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await prisma.marketingAccount.findFirst({
      where: { id: parseInt(id), user_id: req.user.id, status: 'ACTIVE' },
    });
    if (!account) return res.status(404).json({ error: 'Active account not found' });

    const io = req.app.get('io');
    const result = await syncAccountCampaigns(account, io);

    await log({ user_id: req.user.id, action: 'UPDATE', module: 'marketing', entity_id: account.id, entity_type: 'MarketingAccount', description: `Synced ${account.platform} account "${account.account_name}": ${result.imported} imported, ${result.metrics} metrics updated` });

    res.json({ account_id: account.id, platform: account.platform, ...result });
  } catch (err) { next(err); }
};

// ── Sync ALL active accounts ──────────────────────────────────────────────────
const syncAllAccounts = async (req, res, next) => {
  try {
    const { syncAllAccounts: syncAll } = require('../lib/sync');
    const io = req.app.get('io');
    const results = await syncAll(io);
    res.json({ results });
  } catch (err) { next(err); }
};

// ── List imported campaigns for an account ────────────────────────────────────
const listAccountCampaigns = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await prisma.marketingAccount.findFirst({
      where: { id: parseInt(id), user_id: req.user.id },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const campaigns = await prisma.campaign.findMany({
      where: { marketing_account_id: parseInt(id) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, platform: true, status: true,
        link_status: true, external_id: true, budget: true, spent: true,
        client_id: true, project_id: true, createdAt: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
        _count: { select: { metrics: true } },
      },
    });
    res.json(campaigns);
  } catch (err) { next(err); }
};

// ── Link a campaign to a client/project ──────────────────────────────────────
const linkCampaign = async (req, res, next) => {
  try {
    const { campaign_id, client_id, project_id } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id required' });

    const campaign = await prisma.campaign.findUnique({ where: { id: parseInt(campaign_id) } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const updated = await prisma.campaign.update({
      where: { id: parseInt(campaign_id) },
      data: {
        link_status: 'LINKED',
        ...(client_id && { client_id: parseInt(client_id) }),
        ...(project_id && { project_id: parseInt(project_id) }),
      },
    });

    await log({ user_id: req.user.id, action: 'UPDATE', module: 'marketing', entity_id: campaign.id, entity_type: 'Campaign', description: `Linked campaign "${campaign.title}" to client/project` });
    res.json(updated);
  } catch (err) { next(err); }
};

// ── Get ROI summary across all connected accounts ─────────────────────────────
const getAccountsROISummary = async (req, res, next) => {
  try {
    const accounts = await prisma.marketingAccount.findMany({
      where: { user_id: req.user.id },
      select: { id: true, platform: true, account_name: true, status: true },
    });

    const summary = await Promise.all(accounts.map(async (acct) => {
      const campaigns = await prisma.campaign.findMany({
        where: { marketing_account_id: acct.id },
        select: { id: true, title: true, spent: true },
      });

      const campaignIds = campaigns.map(c => c.id);
      const metricsAgg = await prisma.campaignMetric.aggregate({
        where: { campaign_id: { in: campaignIds } },
        _sum: { spend: true, revenue: true, impressions: true, clicks: true, conversions: true },
      });

      const spend = parseFloat(metricsAgg._sum.spend || 0);
      const revenue = parseFloat(metricsAgg._sum.revenue || 0);
      const roi = spend > 0 ? Math.round(((revenue - spend) / spend) * 100) : 0;

      return {
        ...acct,
        campaignCount: campaigns.length,
        totalSpend: spend,
        totalRevenue: revenue,
        roi,
        impressions: parseInt(metricsAgg._sum.impressions || 0),
        clicks: parseInt(metricsAgg._sum.clicks || 0),
        conversions: parseInt(metricsAgg._sum.conversions || 0),
      };
    }));

    res.json(summary);
  } catch (err) { next(err); }
};

module.exports = {
  listAccounts,
  disconnectAccount,
  reconnectAccount,
  syncAccount,
  syncAllAccounts,
  listAccountCampaigns,
  linkCampaign,
  getAccountsROISummary,
};
