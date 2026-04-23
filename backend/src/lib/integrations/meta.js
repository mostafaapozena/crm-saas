'use strict';

// Meta Ads (Facebook/Instagram) integration service
// Set META_ADS_ACCESS_TOKEN and META_ADS_ACCOUNT_ID in .env for real API calls
// Without those vars the service returns simulated data for development

const META_BASE_URL = 'https://graph.facebook.com/v19.0';
const MAX_RETRIES = 3;

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Fetch with exponential-backoff retry for rate limits (429) and server errors (5xx).
 */
async function _fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await _sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await _sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw lastErr || new Error('Max retries exceeded');
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Parse raw insights data object into our standard metric shape */
function _parseInsights(d) {
  const conversions = (d.actions || []).find(a => a.action_type === 'purchase')?.value || 0;
  const revenue     = (d.action_values || []).find(a => a.action_type === 'purchase')?.value || 0;
  return {
    impressions:  parseInt(d.impressions || 0),
    clicks:       parseInt(d.clicks || 0),
    conversions:  parseInt(conversions),
    spend:        parseFloat(d.spend || 0),
    revenue:      parseFloat(revenue),
  };
}

/**
 * Map Meta campaign status string to internal status.
 * DELETED / ARCHIVED → 'ARCHIVED' so we soft-delete instead of removing the row.
 */
function normalizeCampaignStatus(apiStatus) {
  if (apiStatus === 'ACTIVE')                        return 'ACTIVE';
  if (apiStatus === 'DELETED' || apiStatus === 'ARCHIVED') return 'ARCHIVED';
  return 'PAUSED'; // PAUSED, IN_PROCESS, WITH_ISSUES, etc.
}

// ── Legacy env-var based functions (still used by syncPlatformCampaigns) ──────

async function fetchMetaCampaignMetrics(externalCampaignId, dateRange) {
  const { since, until } = dateRange;
  const token = process.env.META_ADS_ACCESS_TOKEN;

  if (!token || token === 'your_meta_access_token') {
    return _simulateMetrics(externalCampaignId);
  }

  try {
    const params = new URLSearchParams({
      access_token: token,
      fields: 'impressions,clicks,spend,actions,action_values',
      time_range: JSON.stringify({ since, until }),
      level: 'campaign',
    });
    const res = await _fetchWithRetry(`${META_BASE_URL}/${externalCampaignId}/insights?${params}`);
    if (!res.ok) throw new Error(`Meta API error: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    const d = json.data?.[0];
    return d ? _parseInsights(d) : null;
  } catch (err) {
    console.error('[Meta Ads] fetchMetaCampaignMetrics error:', err.message);
    return null;
  }
}

async function fetchAllMetaCampaigns() {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;

  if (!token || token === 'your_meta_access_token') return [];

  try {
    const params = new URLSearchParams({
      access_token: token,
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining',
      limit: '500',
    });
    const res = await _fetchWithRetry(`${META_BASE_URL}/act_${accountId}/campaigns?${params}`);
    if (!res.ok) throw new Error(`Meta API error: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.data || [];
  } catch (err) {
    console.error('[Meta Ads] fetchAllCampaigns error:', err.message);
    return [];
  }
}

function _simulateMetrics(campaignId) {
  const seed = parseInt(campaignId) || 1;
  return {
    impressions: 5000 + (seed * 317) % 20000,
    clicks:      150  + (seed * 47)  % 800,
    conversions: 5    + (seed * 13)  % 60,
    spend:       parseFloat((200 + (seed * 37)  % 1500).toFixed(2)),
    revenue:     parseFloat((800 + (seed * 113) % 6000).toFixed(2)),
  };
}

// ── Account-token-based functions (OAuth accounts) ────────────────────────────

/**
 * Fetch all ad accounts accessible with a user token.
 * Handles cursor-based pagination — returns full list regardless of count.
 */
async function fetchMetaAdAccounts(accessToken) {
  const accounts = [];
  let nextUrl = `${META_BASE_URL}/me/adaccounts?${new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,account_id,account_status,currency,timezone_name',
    limit: '200',
  })}`;

  while (nextUrl) {
    try {
      const res = await _fetchWithRetry(nextUrl);
      if (!res.ok) throw new Error(`Meta API ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      accounts.push(...(json.data || []));
      nextUrl = json.paging?.next || null;
    } catch (err) {
      console.error('[Meta] fetchMetaAdAccounts pagination error:', err.message);
      break; // return what we have so far
    }
  }
  return accounts;
}

/**
 * Fetch all campaigns for a specific ad account.
 * Handles cursor pagination; maps API status to internal status via normalizeCampaignStatus.
 */
async function fetchAccountCampaigns(accessToken, adAccountId) {
  const campaigns = [];
  let nextUrl = `${META_BASE_URL}/act_${adAccountId}/campaigns?${new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,effective_status',
    limit: '200',
  })}`;

  while (nextUrl) {
    try {
      const res = await _fetchWithRetry(nextUrl);
      if (!res.ok) throw new Error(`Meta API ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      // Attach normalized status so sync.js doesn't need to know Meta status strings
      const page = (json.data || []).map(c => ({
        ...c,
        _normalizedStatus: normalizeCampaignStatus(c.status),
      }));
      campaigns.push(...page);
      nextUrl = json.paging?.next || null;
    } catch (err) {
      console.error('[Meta] fetchAccountCampaigns pagination error:', err.message);
      break;
    }
  }
  return campaigns;
}

/**
 * Fetch insights for a campaign using a stored token.
 */
async function fetchCampaignMetricsWithToken(accessToken, externalCampaignId, dateRange) {
  const { since, until } = dateRange;
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'impressions,clicks,spend,actions,action_values',
      time_range: JSON.stringify({ since, until }),
      level: 'campaign',
    });
    const res = await _fetchWithRetry(`${META_BASE_URL}/${externalCampaignId}/insights?${params}`);
    if (!res.ok) throw new Error(`Meta API ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    const d = json.data?.[0];
    return d ? _parseInsights(d) : null;
  } catch (err) {
    console.error('[Meta] fetchCampaignMetricsWithToken error:', err.message);
    return null;
  }
}

/**
 * Exchange a short-lived token for a long-lived token (60-day).
 */
async function exchangeForLongLivedToken(shortToken) {
  try {
    const params = new URLSearchParams({
      grant_type:      'fb_exchange_token',
      client_id:       process.env.META_APP_ID,
      client_secret:   process.env.META_APP_SECRET,
      fb_exchange_token: shortToken,
    });
    const res = await _fetchWithRetry(`${META_BASE_URL}/oauth/access_token?${params}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json; // { access_token, token_type, expires_in }
  } catch (err) {
    console.error('[Meta] exchangeForLongLivedToken error:', err.message);
    return null;
  }
}

/**
 * Verify a token is still valid by calling /me.
 * Used to detect expired long-lived tokens before running a sync.
 */
async function verifyMetaToken(accessToken) {
  try {
    const res = await fetch(`${META_BASE_URL}/me?access_token=${encodeURIComponent(accessToken)}&fields=id`);
    const json = await res.json();
    return !json.error;
  } catch {
    return false;
  }
}

module.exports = {
  fetchMetaCampaignMetrics,
  fetchAllMetaCampaigns,
  fetchMetaAdAccounts,
  fetchAccountCampaigns,
  fetchCampaignMetricsWithToken,
  exchangeForLongLivedToken,
  verifyMetaToken,
  normalizeCampaignStatus,
};
