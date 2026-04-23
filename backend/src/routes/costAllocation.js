const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');
const ctrl = require('../controllers/costAllocationController');

router.get('/rules',      authenticate, requireFinance, ctrl.getRules);
router.post('/rules',     authenticate, requireFinance, ctrl.createRule);
router.put('/rules/:id',  authenticate, requireFinance, ctrl.updateRule);
router.post('/run',       authenticate, requireFinance, ctrl.runAllocation);
router.get('/entries',    authenticate, requireFinance, ctrl.getEntries);

module.exports = router;
