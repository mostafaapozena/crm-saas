'use strict';

const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  listAccounts,
  disconnectAccount,
  reconnectAccount,
  syncAccount,
  syncAllAccounts,
  listAccountCampaigns,
  linkCampaign,
  getAccountsROISummary,
} = require('../controllers/marketingAccounts');

router.use(authenticate);

router.get('/',              listAccounts);
router.get('/roi-summary',   getAccountsROISummary);
router.post('/sync-all',     syncAllAccounts);
router.post('/link-campaign', linkCampaign);

router.get('/:id/campaigns', listAccountCampaigns);
router.post('/:id/sync',     syncAccount);
router.put('/:id/reconnect', reconnectAccount);
router.delete('/:id',        disconnectAccount);

module.exports = router;
