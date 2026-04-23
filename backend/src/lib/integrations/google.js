'use strict';

// Google Ads integration service
// Set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
// GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID in .env for real API calls

const GOOGLE_ADS_API_VERSION = 'v16';
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

async function _getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  return json.access_token;
}

async function fetchGoogleCampaignMetrics(externalCampaignId, dateRange) {
  const { since, until } = dateRange;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!devToken || devToken === 'your_google_developer_token') {
    return _simulateMetrics(externalCampaignId);
  }

  try {
    const accessToken = await _getAccessToken();
    const query = `
      SELECT
        campaign.id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.id = ${externalCampaignId}
        AND segments.date BETWEEN '${since}' AND '${until}'
    `;

    const url = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:search`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) throw new Error(`Google Ads API error: ${res.status}`);
    const json = await res.json();
    const rows = json.results || [];

    const totals = rows.reduce((acc, r) => {
      const m = r.metrics;
      acc.impressions += parseInt(m.impressions || 0);
      acc.clicks += parseInt(m.clicks || 0);
      acc.conversions += parseFloat(m.conversions || 0);
      acc.spend += parseFloat(m.cost_micros || 0) / 1_000_000;
      acc.revenue += parseFloat(m.conversions_value || 0);
      return acc;
    }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });

    return {
      impressions: totals.impressions,
      clicks: totals.clicks,
      conversions: Math.round(totals.conversions),
      spend: parseFloat(totals.spend.toFixed(2)),
      revenue: parseFloat(totals.revenue.toFixed(2)),
    };
  } catch (err) {
    console.error('[Google Ads] API error:', err.message);
    return null;
  }
}

async function fetchAllGoogleCampaigns() {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!devToken || devToken === 'your_google_developer_token') return [];

  try {
    const accessToken = await _getAccessToken();
    const query = `
      SELECT campaign.id, campaign.name, campaign.status,
             campaign_budget.amount_micros
      FROM campaign WHERE campaign.status != 'REMOVED'
    `;
    const url = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:search`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Google Ads API error: ${res.status}`);
    const json = await res.json();
    return (json.results || []).map(r => ({
      id: r.campaign.id,
      name: r.campaign.name,
      status: r.campaign.status,
      budget: parseFloat(r.campaignBudget?.amount_micros || 0) / 1_000_000,
    }));
  } catch (err) {
    console.error('[Google Ads] fetchAllCampaigns error:', err.message);
    return [];
  }
}

function _simulateMetrics(campaignId) {
  const seed = campaignId || 2;
  return {
    impressions: 8000 + (seed * 419) % 30000,
    clicks: 200 + (seed * 67) % 1200,
    conversions: 8 + (seed * 19) % 80,
    spend: parseFloat((300 + (seed * 53) % 2000).toFixed(2)),
    revenue: parseFloat((1200 + (seed * 173) % 8000).toFixed(2)),
  };
}

// ── Account-token-based functions (OAuth accounts) ────────────────────────────

/**
 * Exchange an authorization code for access + refresh tokens.
 */
async function exchangeGoogleCode(code, redirectUri) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
      }),
    });
    return res.json();
  } catch (err) {
    console.error('[Google] exchangeGoogleCode error:', err.message);
    return null;
  }
}

/**
 * Get a fresh access token using a stored refresh token.
 */
async function refreshGoogleToken(refreshToken) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const json = await res.json();
    return json.access_token || null;
  } catch (err) {
    console.error('[Google] refreshGoogleToken error:', err.message);
    return null;
  }
}

/**
 * Fetch accessible Google Ads customer IDs for an access token.
 */
async function fetchGoogleCustomerIds(accessToken) {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN_OAUTH || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  try {
    const res = await fetch(`${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
      },
    });
    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const json = await res.json();
    return (json.resourceNames || []).map(r => r.replace('customers/', ''));
  } catch (err) {
    console.error('[Google] fetchCustomerIds error:', err.message);
    return [];
  }
}

/**
 * Fetch all campaigns for a customer using a stored access token.
 */
async function fetchAccountCampaigns(customerId, accessToken) {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN_OAUTH || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  try {
    const query = `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED' LIMIT 500`;
    const res = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const json = await res.json();
    return (json.results || []).map(r => ({
      id: r.campaign.id,
      name: r.campaign.name,
      status: r.campaign.status,
      budget: parseFloat(r.campaignBudget?.amount_micros || 0) / 1_000_000,
    }));
  } catch (err) {
    console.error('[Google] fetchAccountCampaigns error:', err.message);
    return [];
  }
}

/**
 * Fetch metrics for a campaign using a stored access token.
 */
async function fetchCampaignMetricsWithToken(customerId, accessToken, externalCampaignId, dateRange) {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN_OAUTH || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const { since, until } = dateRange;
  try {
    const query = `SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros, metrics.conversions_value FROM campaign WHERE campaign.id = ${externalCampaignId} AND segments.date BETWEEN '${since}' AND '${until}'`;
    const res = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const json = await res.json();
    const rows = json.results || [];
    const totals = rows.reduce((acc, r) => {
      const m = r.metrics;
      acc.impressions += parseInt(m.impressions || 0);
      acc.clicks += parseInt(m.clicks || 0);
      acc.conversions += parseFloat(m.conversions || 0);
      acc.spend += parseFloat(m.cost_micros || 0) / 1_000_000;
      acc.revenue += parseFloat(m.conversions_value || 0);
      return acc;
    }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
    return {
      impressions: totals.impressions,
      clicks: totals.clicks,
      conversions: Math.round(totals.conversions),
      spend: parseFloat(totals.spend.toFixed(2)),
      revenue: parseFloat(totals.revenue.toFixed(2)),
    };
  } catch (err) {
    console.error('[Google] fetchCampaignMetricsWithToken error:', err.message);
    return null;
  }
}

module.exports = {
  fetchGoogleCampaignMetrics,
  fetchAllGoogleCampaigns,
  exchangeGoogleCode,
  refreshGoogleToken,
  fetchGoogleCustomerIds,
  fetchAccountCampaigns,
  fetchCampaignMetricsWithToken,
};
