const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');
const ctrl = require('../controllers/fixedCostsController');

router.get('/',     authenticate, requireFinance, ctrl.getAll);
router.post('/',    authenticate, requireFinance, ctrl.create);
router.put('/:id',  authenticate, requireFinance, ctrl.update);
router.delete('/:id', authenticate, requireFinance, ctrl.remove);

module.exports = router;
