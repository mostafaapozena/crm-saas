const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/deliveries')

router.get('/', authenticate, ctrl.list)
router.get('/:id', authenticate, ctrl.get)
router.post('/', authenticate, ctrl.create)
router.put('/:id', authenticate, ctrl.update)
router.post('/:id/assign', authenticate, ctrl.assignDriver)

module.exports = router
