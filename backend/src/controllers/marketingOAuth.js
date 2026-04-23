'use strict';

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { encryptToken } = require('../lib/tokenCrypto');
const { exchangeForLongLivedToken, fetchMetaAdAccounts } = require('../lib/integrations/meta');
const { exchangeGoogleCode, fetchGoogleCustomerIds } = require('../lib/integrations/google');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:5000';

const isConfigured = {
  meta:   () => !!(process.env.META_APP_ID   && process.env.META_APP_ID   !== 'your_meta_app_id'),
  google: () => !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_ID !== 'your_google_oauth_client_id'),
};

// ── Status endpoint ─────────────────────────────────────────────────────────
const getOAuthStatus = (req, res) => {
  res.json({
    meta:   { configured: isConfigured.meta() },
    google: { configured: isConfigured.google() },
  });
};

// ── META ──────────────────────────────────────────────────────────────────────

const initiateMetaOAuth = (req, res) => {
  if (!isConfigured.meta()) {
    console.warn('[Meta OAuth] META_APP_ID not configured');
    return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=meta_not_configured`);
  }

  const { token } = req.query;
  if (!token) return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=meta_not_configured`);

  // Verify the JWT is valid before starting the OAuth flow
  try { jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=meta_not_configured`); }

  const state = Buffer.from(JSON.stringify({ token })).toString('base64url');
  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID,                           // ✅ was `appId` (undefined)
    redirect_uri:  `${BACKEND_URL}/marketing-oauth/meta/callback`,
    scope:         'ads_read,ads_management,business_management',
    state,
    response_type: 'code',
  });

  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
};

const handleMetaCallback = async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  if (oauthError) return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=meta_denied`);
  if (!code || !state) return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=meta_failed`);

  try {
    const { token } = JSON.parse(Buffer.from(state, 'base64url').toString());
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Exchange code for short-lived token
    const params = new URLSearchParams({
      client_id:     process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri:  `${BACKEND_URL}/marketing-oauth/meta/callback`,
      code,
    });
    const shortTokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
    const shortToken = await shortTokenRes.json();
    if (shortToken.error) throw new Error(shortToken.error.message);

    // Exchange for long-lived token (60 days)
    const llData = await exchangeForLongLivedToken(shortToken.access_token);
    if (!llData) throw new Error('Failed to exchange for long-lived token');

    const rawAccessToken = llData.access_token;
    const expiry = llData.expires_in ? new Date(Date.now() + llData.expires_in * 1000) : null;

    // Encrypt token before storing
    const { encrypted: accessToken, iv: tokenIv } = encryptToken(rawAccessToken);

    // Fetch all ad accounts for this token
    const adAccounts = await fetchMetaAdAccounts(rawAccessToken);

    if (adAccounts.length === 0) {
      await prisma.marketingAccount.upsert({
        where: { user_id_platform_account_id: { user_id: userId, platform: 'META', account_id: 'me' } },
        update: { access_token: accessToken, token_iv: tokenIv, token_expiry: expiry, status: 'ACTIVE' },
        create: {
          user_id: userId, platform: 'META', account_id: 'me',
          account_name: 'Meta (no ad accounts)',
          access_token: accessToken, token_iv: tokenIv, token_expiry: expiry, status: 'ACTIVE',
        },
      });
    } else {
      for (const acct of adAccounts) {
        const accountId = (acct.account_id || acct.id || '').replace('act_', '');
        await prisma.marketingAccount.upsert({
          where: { user_id_platform_account_id: { user_id: userId, platform: 'META', account_id: accountId } },
          update: { access_token: accessToken, token_iv: tokenIv, token_expiry: expiry, status: 'ACTIVE', account_name: acct.name },
          create: {
            user_id: userId, platform: 'META', account_id: accountId,
            account_name: acct.name || `Meta Account ${accountId}`,
            access_token: accessToken, token_iv: tokenIv, token_expiry: expiry, status: 'ACTIVE',
          },
        });
      }
    }

    res.redirect(`${FRONTEND_URL}/marketing/accounts?connected=meta`);
  } catch (err) {
    console.error('[Meta OAuth] Callback error:', err.message);
    res.redirect(`${FRONTEND_URL}/marketing/accounts?error=meta_failed`);
  }
};

// ── GOOGLE ────────────────────────────────────────────────────────────────────

const initiateGoogleOAuth = (req, res) => {
  if (!isConfigured.google()) {
    console.warn('[Google OAuth] GOOGLE_OAUTH_CLIENT_ID not configured');
    return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=google_not_configured`);
  }

  const { token } = req.query;
  if (!token) return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=google_not_configured`);

  try { jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=google_not_configured`); }

  const state = Buffer.from(JSON.stringify({ token })).toString('base64url');
  const params = new URLSearchParams({
    client_id:    process.env.GOOGLE_OAUTH_CLIENT_ID,                 // ✅ was `clientId` (undefined)
    redirect_uri: `${BACKEND_URL}/marketing-oauth/google/callback`,
    scope:        'https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.email',
    access_type:  'offline',
    prompt:       'consent',
    response_type: 'code',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

const handleGoogleCallback = async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  if (oauthError) return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=google_denied`);
  if (!code || !state) return res.redirect(`${FRONTEND_URL}/marketing/accounts?error=google_failed`);

  try {
    const { token } = JSON.parse(Buffer.from(state, 'base64url').toString());
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const redirectUri = `${BACKEND_URL}/marketing-oauth/google/callback`;
    const tokenData = await exchangeGoogleCode(code, redirectUri);
    if (!tokenData || tokenData.error) throw new Error(tokenData?.error_description || 'Token exchange failed');

    const rawAccessToken  = tokenData.access_token;
    const rawRefreshToken = tokenData.refresh_token;
    const expiry = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

    // Encrypt before storing
    const { encrypted: accessToken, iv: tokenIv } = encryptToken(rawAccessToken);
    const encRefresh = rawRefreshToken ? encryptToken(rawRefreshToken).encrypted : null;

    const customerIds = await fetchGoogleCustomerIds(rawAccessToken);

    if (customerIds.length === 0) {
      await prisma.marketingAccount.upsert({
        where: { user_id_platform_account_id: { user_id: userId, platform: 'GOOGLE', account_id: 'me' } },
        update: { access_token: accessToken, token_iv: tokenIv, refresh_token: encRefresh, token_expiry: expiry, status: 'ACTIVE' },
        create: {
          user_id: userId, platform: 'GOOGLE', account_id: 'me',
          account_name: 'Google Ads (no customers)',
          access_token: accessToken, token_iv: tokenIv, refresh_token: encRefresh, token_expiry: expiry, status: 'ACTIVE',
        },
      });
    } else {
      for (const customerId of customerIds) {
        await prisma.marketingAccount.upsert({
          where: { user_id_platform_account_id: { user_id: userId, platform: 'GOOGLE', account_id: customerId } },
          update: { access_token: accessToken, token_iv: tokenIv, refresh_token: encRefresh, token_expiry: expiry, status: 'ACTIVE' },
          create: {
            user_id: userId, platform: 'GOOGLE', account_id: customerId,
            account_name: `Google Ads Customer ${customerId}`,
            access_token: accessToken, token_iv: tokenIv, refresh_token: encRefresh, token_expiry: expiry, status: 'ACTIVE',
          },
        });
      }
    }

    res.redirect(`${FRONTEND_URL}/marketing/accounts?connected=google`);
  } catch (err) {
    console.error('[Google OAuth] Callback error:', err.message);
    res.redirect(`${FRONTEND_URL}/marketing/accounts?error=google_failed`);
  }
};

module.exports = { getOAuthStatus, initiateMetaOAuth, handleMetaCallback, initiateGoogleOAuth, handleGoogleCallback };
