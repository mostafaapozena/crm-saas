'use strict';

const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRbac } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

const {
  createCampaign, getCampaigns, getCampaign,
  updateCampaign, deleteCampaign, addMetric,
} = require('../controllers/campaigns');

const { syncMeta, syncGoogle, syncCampaign } = require('../controllers/campaignSync');
const { getCreatives, uploadCreative, deleteCreative } = require('../controllers/creatives');
const { getMarketingSummary } = require('../controllers/marketingDashboard');

router.use(authenticate);

// ── Summary (must be before /:id) ────────────────────────────────────────────
router.get('/summary', authorizeRbac(MODULES.MARKETING, 'read'), getMarketingSummary);

// ── Sync (marketing write) ────────────────────────────────────────────────────
router.post('/sync/meta',   authorizeRbac(MODULES.MARKETING, 'update'), syncMeta);
router.post('/sync/google', authorizeRbac(MODULES.MARKETING, 'update'), syncGoogle);

// ── Core CRUD ─────────────────────────────────────────────────────────────────
router.get('/',    authorizeRbac(MODULES.MARKETING, 'read'),   getCampaigns);
router.post('/',   authorizeRbac(MODULES.MARKETING, 'create'), createCampaign);

// ── Metrics (manual entry) ────────────────────────────────────────────────────
router.post('/metrics', authorizeRbac(MODULES.MARKETING, 'update'), addMetric);

// ── Parameterized ─────────────────────────────────────────────────────────────
router.get('/:id',    authorizeRbac(MODULES.MARKETING, 'read'),   getCampaign);
router.put('/:id',    authorizeRbac(MODULES.MARKETING, 'update'), updateCampaign);
router.delete('/:id', authorizeRbac(MODULES.MARKETING, 'delete'), deleteCampaign);

// ── Campaign sync by ID ────────────────────────────────────────────────────────
router.post('/:id/sync', authorizeRbac(MODULES.MARKETING, 'update'), syncCampaign);

// ── Creatives ─────────────────────────────────────────────────────────────────
router.get('/:id/creatives',            authorizeRbac(MODULES.MARKETING, 'read'),   getCreatives);
router.post('/:id/creatives',           authorizeRbac(MODULES.MARKETING, 'update'), uploadCreative);
router.delete('/creatives/:creativeId', authorizeRbac(MODULES.MARKETING, 'delete'), deleteCreative);

module.exports = router;
