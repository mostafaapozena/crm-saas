const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');
const ctrl = require('../controllers/pnlController');

router.get('/',           authenticate, requireFinance, ctrl.getPnL);
router.get('/comparison', authenticate, requireFinance, ctrl.getComparison);

module.exports = router;
