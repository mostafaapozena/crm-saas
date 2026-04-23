'use strict';

const express = require('express');
const router  = express.Router();
const { getOAuthStatus, initiateMetaOAuth, handleMetaCallback, initiateGoogleOAuth, handleGoogleCallback } = require('../controllers/marketingOAuth');
const { authenticate } = require('../middleware/auth');

// Status — which platforms are configured (no secrets exposed)
router.get('/status', authenticate, getOAuthStatus);

// Meta OAuth — redirect flow (token passed as query param, no Bearer header possible)
router.get('/meta',          initiateMetaOAuth);
router.get('/meta/callback', handleMetaCallback);

// Google OAuth — redirect flow
router.get('/google',          initiateGoogleOAuth);
router.get('/google/callback', handleGoogleCallback);

module.exports = router;
