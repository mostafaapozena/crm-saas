'use strict';

const prisma = require('./prisma');
const { decryptToken, encryptToken } = require('./tokenCrypto');
const {
  fetchMetaCampaignMetrics,
  fetchAccountCampaigns: fetchMetaAccountCampaigns,
  fetchCampaignMetricsWithToken: fetchMetaMetricsWithToken,
  verifyMetaToken,
} = require('./integrations/meta');
const {
  fetchGoogleCampaignMetrics,
  fetchAccountCampaigns: fetchGoogleAccountCampaigns,
  fetchCampaignMetricsWithToken: fetchGoogleMetricsWithToken,
  refreshGoogleToken,
} = require('./integrations/google');

// ── Utilities ─────────────────────────────────────────────────────────────────

function lastNDays(n) {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - n);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { since: fmt(since), until: fmt(until) };
}

/** Returns start of today (UTC midnight) */
function todayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Returns start of tomorrow (UTC midnight) */
function tomorrowUTC() {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Upsert a daily metric snapshot — prevents duplicate rows when sync runs
 * multiple times on the same day.
 */
async function _upsertDailyMetric(campaignId, metrics) {
  const today    = todayUTC();
  const tomorrow = tomorrowUTC();

  const existing = await prisma.campaignMetric.findFirst({
    where: { campaign_id: campaignId, date: { gte: today, lt: tomorrow } },
    select: { id: true },
  });

  if (existing) {
    return prisma.campaignMetric.update({
      where: { id: existing.id },
      data: {
        impressions:  metrics.impressions,
        clicks:       metrics.clicks,
        conversions:  metrics.conversions,
        spend:        metrics.spend,
        revenue:      metrics.revenue,
      },
    });
  }

  return prisma.campaignMetric.create({
    data: {
      campaign_id:  campaignId,
      date:         today,
      impressions:  metrics.impressions,
      clicks:       metrics.clicks,
      conversions:  metrics.conversions,
      spend:        metrics.spend,
      revenue:      metrics.revenue,
    },
  });
}

/** Update campaign.spent from the aggregate of all its metric rows */
async function _updateCampaignSpent(campaignId) {
  const agg = await prisma.campaignMetric.aggregate({
    where: { campaign_id: campaignId },
    _sum: { spend: true },
  });
  await prisma.campaign.update({
    where: { id: campaignId },
    data:  { spent: parseFloat(agg._sum.spend || 0) },
  });
}

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Decrypt a stored token.
 * token_iv is null for legacy unencrypted rows → decryptToken passes through.
 */
function _getPlainToken(encryptedHex, tokenIv) {
  return decryptToken(encryptedHex, tokenIv);
}

/**
 * For Google accounts: refresh access token if expired or expiring in <5 min.
 * Encrypts and persists the new token. Returns the current valid plaintext token
 * or null if refresh fails.
 */
async function _getValidGoogleToken(account) {
  const plainAccess  = _getPlainToken(account.access_token, account.token_iv);
  const plainRefresh = account.refresh_token
    ? _getPlainToken(account.refresh_token, account.token_iv) // shared IV for simplicity
    : null;

  if (!plainRefresh) return plainAccess;

  const expires   = account.token_expiry ? new Date(account.token_expiry) : null;
  const needsRefresh = !expires || expires <= new Date(Date.now() + 5 * 60 * 1000);
  if (!needsRefresh) return plainAccess;

  const newPlainToken = await refreshGoogleToken(plainRefresh);
  if (newPlainToken) {
    const { encrypted, iv } = encryptToken(newPlainToken);
    await prisma.marketingAccount.update({
      where: { id: account.id },
      data: {
        access_token: encrypted,
        token_iv:     iv,
        token_expiry: new Date(Date.now() + 3600 * 1000),
      },
    }).catch(() => null);
    return newPlainToken;
  }

  // Refresh failed — mark account expired
  await prisma.marketingAccount.update({
    where: { id: account.id },
    data:  { status: 'EXPIRED' },
  }).catch(() => null);
  return null;
}

/**
 * For Meta accounts: long-lived tokens expire in ~60 days.
 * Verify the token is still valid; mark EXPIRED if not.
 * Returns the plaintext token or null.
 */
async function _getValidMetaToken(account) {
  const plainToken = _getPlainToken(account.access_token, account.token_iv);
  if (!plainToken) return null;

  // Check token_expiry if stored
  const expires = account.token_expiry ? new Date(account.token_expiry) : null;
  if (expires && expires <= new Date()) {
    console.warn(`[Sync] Meta token for account ${account.id} is past expiry — marking EXPIRED`);
    await prisma.marketingAccount.update({ where: { id: account.id }, data: { status: 'EXPIRED' } }).catch(() => null);
    return null;
  }

  // If expiry is not stored or token is within 7 days of expiry, verify live
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const nearExpiry = expires && (expires.getTime() - Date.now()) < sevenDays;
  if (!expires || nearExpiry) {
    const valid = await verifyMetaToken(plainToken);
    if (!valid) {
      console.warn(`[Sync] Meta token for account ${account.id} failed live verification — marking EXPIRED`);
      await prisma.marketingAccount.update({ where: { id: account.id }, data: { status: 'EXPIRED' } }).catch(() => null);
      return null;
    }
  }

  return plainToken;
}

// ── Legacy env-var sync (backward compatible) ─────────────────────────────────

async function syncSingleCampaign(campaign, io) {
  if (!campaign.external_id) return { skipped: true, reason: 'no external_id' };

  const dateRange = lastNDays(1);
  let metrics = null;

  try {
    if (campaign.platform === 'META') {
      metrics = await fetchMetaCampaignMetrics(campaign.external_id, dateRange);
    } else if (campaign.platform === 'GOOGLE') {
      metrics = await fetchGoogleCampaignMetrics(campaign.external_id, dateRange);
    }
  } catch (err) {
    console.error(`[Sync] Error fetching metrics for campaign ${campaign.id}:`, err.message);
    return { error: err.message };
  }

  if (!metrics) return { skipped: true, reason: 'no metrics returned' };

  await _upsertDailyMetric(campaign.id, metrics);
  await _updateCampaignSpent(campaign.id);

  // Budget alert
  const agg = await prisma.campaignMetric.aggregate({
    where: { campaign_id: campaign.id },
    _sum: { spend: true },
  });
  const totalSpent = parseFloat(agg._sum.spend || 0);
  const budget     = parseFloat(campaign.budget || 0);

  if (budget > 0 && totalSpent >= budget) {
    console.warn(`[Alert] Campaign ${campaign.id} "${campaign.title}" spent ${totalSpent} ≥ budget ${budget}`);
    io?.emit('campaign:budget_exceeded', { campaign_id: campaign.id, title: campaign.title, spent: totalSpent, budget });
  }

  return { synced: true, metrics };
}

async function syncPlatformCampaigns(platform, io) {
  const campaigns = await prisma.campaign.findMany({
    where: { platform, status: 'ACTIVE', external_id: { not: null } },
  });

  const results = [];
  for (const c of campaigns) {
    const result = await syncSingleCampaign(c, io);
    results.push({ campaign_id: c.id, title: c.title, ...result });
  }
  return results;
}

// ── Account-based sync (OAuth accounts) ───────────────────────────────────────

/**
 * Sync all campaigns from a connected MarketingAccount.
 *
 * Improvements vs. original:
 * - Decrypts stored tokens before use
 * - Validates Meta token liveness (marks EXPIRED if invalid)
 * - Refreshes Google tokens automatically
 * - Uses _upsertDailyMetric to prevent same-day duplicate rows
 * - Sets campaign.status = 'ARCHIVED' for DELETED/ARCHIVED API campaigns
 * - Updates last_synced_at on the account
 */
async function syncAccountCampaigns(account, io) {
  const results = { imported: 0, updated: 0, metrics: 0, errors: [] };
  const dateRange = lastNDays(1);

  try {
    let apiCampaigns = [];
    let accessToken  = null;

    if (account.platform === 'META') {
      accessToken = await _getValidMetaToken(account);
      if (!accessToken) {
        results.errors.push('Meta token expired or invalid');
        return results;
      }
      apiCampaigns = await fetchMetaAccountCampaigns(accessToken, account.account_id);

    } else if (account.platform === 'GOOGLE') {
      accessToken = await _getValidGoogleToken(account);
      if (!accessToken) {
        results.errors.push('Google token expired and refresh failed');
        return results;
      }
      apiCampaigns = await fetchGoogleAccountCampaigns(account.account_id, accessToken);
    }

    for (const apiCamp of apiCampaigns) {
      const externalId = String(apiCamp.id);
      const title      = apiCamp.name || `Campaign ${externalId}`;
      const platform   = account.platform;

      // Normalized status — uses _normalizedStatus from meta.js or raw for Google
      const normalizedStatus =
        apiCamp._normalizedStatus ||
        ((apiCamp.status === 'ACTIVE' || apiCamp.status === 'ENABLED') ? 'ACTIVE' : 'PAUSED');

      try {
        // Upsert campaign — findFirst then create/update avoids unique constraint issues
        // on nullable external_id columns in SQLite
        let campaign = await prisma.campaign.findFirst({ where: { external_id: externalId, platform } });

        if (!campaign) {
          campaign = await prisma.campaign.create({
            data: {
              title,
              platform,
              external_id: externalId,
              status:      normalizedStatus === 'ARCHIVED' ? 'PAUSED' : normalizedStatus,
              budget:      apiCamp.daily_budget ? parseFloat(apiCamp.daily_budget) / 100 : null,
              link_status: 'UNLINKED',
              marketing_account_id: account.id,
              created_by:  account.user_id,
            },
          });
          results.imported++;
          io?.emit('campaign:auto_imported', { id: campaign.id, title, platform });

        } else {
          // Update status — ARCHIVED campaigns are soft-deleted (not removed)
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status:               normalizedStatus,
              marketing_account_id: account.id,
              ...(apiCamp.objective && { title: title }), // keep name in sync
            },
          });
          results.updated++;
        }

        // Skip metrics for archived/deleted campaigns
        if (normalizedStatus === 'ARCHIVED') continue;

        // Fetch and upsert daily metrics (no duplicates)
        let metrics = null;
        if (account.platform === 'META') {
          metrics = await fetchMetaMetricsWithToken(accessToken, externalId, dateRange);
        } else if (account.platform === 'GOOGLE') {
          metrics = await fetchGoogleMetricsWithToken(account.account_id, accessToken, externalId, dateRange);
        }

        if (metrics) {
          await _upsertDailyMetric(campaign.id, metrics);
          await _updateCampaignSpent(campaign.id);
          results.metrics++;

          // Budget alert
          const totalSpent = parseFloat((await prisma.campaignMetric.aggregate({
            where: { campaign_id: campaign.id },
            _sum: { spend: true },
          }))._sum.spend || 0);
          const budget = parseFloat(campaign.budget || 0);
          if (budget > 0 && totalSpent >= budget) {
            io?.emit('campaign:budget_exceeded', { campaign_id: campaign.id, title, spent: totalSpent, budget });
          }
        }

      } catch (campErr) {
        results.errors.push(`Campaign ${externalId}: ${campErr.message}`);
      }
    }

    // Record last successful sync time
    await prisma.marketingAccount.update({
      where: { id: account.id },
      data:  { last_synced_at: new Date() },
    }).catch(() => null);

  } catch (err) {
    console.error(`[Sync] syncAccountCampaigns error (account ${account.id}):`, err.message);
    results.errors.push(err.message);
  }

  return results;
}

/**
 * Sync all active connected accounts.
 */
async function syncAllAccounts(io) {
  const accounts = await prisma.marketingAccount.findMany({ where: { status: 'ACTIVE' } });
  const summary  = [];
  for (const account of accounts) {
    const result = await syncAccountCampaigns(account, io);
    summary.push({ account_id: account.id, platform: account.platform, ...result });
  }
  return summary;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

function startSyncScheduler(io) {
  const intervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || '30');
  const intervalMs      = intervalMinutes * 60 * 1000;

  console.log(`[Sync] Scheduler started — every ${intervalMinutes} minutes`);

  setInterval(async () => {
    console.log('[Sync] Auto-sync triggered');
    try {
      const [metaResults, googleResults] = await Promise.all([
        syncPlatformCampaigns('META',   io),
        syncPlatformCampaigns('GOOGLE', io),
      ]);
      const accountResults = await syncAllAccounts(io);
      const total = metaResults.length + googleResults.length + accountResults.length;
      console.log(`[Sync] Completed — ${total} campaigns/accounts processed`);
    } catch (err) {
      console.error('[Sync] Auto-sync error:', err.message);
    }
  }, intervalMs);
}

module.exports = {
  syncSingleCampaign,
  syncPlatformCampaigns,
  syncAccountCampaigns,
  syncAllAccounts,
  startSyncScheduler,
};
