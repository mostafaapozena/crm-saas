const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/posReports')

router.get('/sales', authenticate, ctrl.salesReport)
router.get('/inventory', authenticate, ctrl.inventoryReport)
router.get('/profit', authenticate, ctrl.profitReport)
router.get('/delivery', authenticate, ctrl.deliveryReport)

module.exports = router
