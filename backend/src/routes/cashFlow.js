const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');
const ctrl = require('../controllers/cashFlowController');

router.get('/',           authenticate, requireFinance, ctrl.getCashFlow);
router.get('/trend',      authenticate, requireFinance, ctrl.getTrend);
router.get('/entries',    authenticate, requireFinance, ctrl.getEntries);
router.post('/entries',   authenticate, requireFinance, ctrl.createEntry);
router.delete('/entries/:id', authenticate, requireFinance, ctrl.remove);

module.exports = router;
