const express = require('express');
const router = express.Router();
const { createClient, getClients, getClient, updateClient } = require('../controllers/clients');
const { authenticate } = require('../middleware/auth');
const { authorizeRbac } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

router.use(authenticate);

router.get('/',     authorizeRbac(MODULES.CRM, 'read'),   getClients);
router.get('/:id',  authorizeRbac(MODULES.CRM, 'read'),   getClient);
router.post('/',    authorizeRbac(MODULES.CRM, 'create'), createClient);
router.put('/:id',  authorizeRbac(MODULES.CRM, 'update'), updateClient);

module.exports = router;
