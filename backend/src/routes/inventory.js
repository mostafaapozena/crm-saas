const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/inventory')

router.get('/warehouses', authenticate, ctrl.listWarehouses)
router.post('/warehouses', authenticate, ctrl.createWarehouse)
router.put('/warehouses/:id', authenticate, ctrl.updateWarehouse)
router.get('/alerts', authenticate, ctrl.lowStockAlerts)
router.get('/', authenticate, ctrl.list)
router.post('/adjust', authenticate, ctrl.adjustStock)
router.post('/transfer', authenticate, ctrl.transferStock)

module.exports = router
