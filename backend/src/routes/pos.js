const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/pos')

router.get('/sales', authenticate, ctrl.listSales)
router.get('/sales/:id', authenticate, ctrl.getSale)
router.post('/sales', authenticate, ctrl.createSale)
router.put('/sales/:id/status', authenticate, ctrl.updateSaleStatus)
router.post('/sales/:id/refund', authenticate, ctrl.refundSale)

module.exports = router
