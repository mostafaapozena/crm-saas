const express = require('express');
const router = express.Router();
const { createDeal, getDeals, updateDeal } = require('../controllers/deals');
const { authenticate } = require('../middleware/auth');
const { authorizeRbac } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

router.use(authenticate);

router.get('/',    authorizeRbac(MODULES.CRM, 'read'),   getDeals);
router.post('/',   authorizeRbac(MODULES.CRM, 'create'), createDeal);
router.put('/:id', authorizeRbac(MODULES.CRM, 'update'), updateDeal);

module.exports = router;
