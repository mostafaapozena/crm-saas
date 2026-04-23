const express = require('express');
const router = express.Router();
const { createLead, getLeads, updateLead, deleteLead } = require('../controllers/leads');
const { authenticate } = require('../middleware/auth');
const { authorizeRbac } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

router.use(authenticate);

router.get('/',    authorizeRbac(MODULES.CRM, 'read'),   getLeads);
router.post('/',   authorizeRbac(MODULES.CRM, 'create'), createLead);
router.put('/:id', authorizeRbac(MODULES.CRM, 'update'), updateLead);
router.delete('/:id', authorizeRbac(MODULES.CRM, 'delete'), deleteLead);

module.exports = router;
