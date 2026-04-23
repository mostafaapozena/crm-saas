const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');
const ctrl = require('../controllers/cogsController');

router.get('/',       authenticate, requireFinance, ctrl.getAll);
router.post('/sync',  authenticate, requireFinance, ctrl.syncFromPurchases);
router.post('/',      authenticate, requireFinance, ctrl.createManual);
router.delete('/:id', authenticate, requireFinance, ctrl.remove);

module.exports = router;
