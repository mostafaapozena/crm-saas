const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/posPurchases')

router.get('/', authenticate, ctrl.list)
router.get('/:id', authenticate, ctrl.get)
router.post('/', authenticate, ctrl.create)
router.put('/:id', authenticate, ctrl.update)
router.post('/:id/receive', authenticate, ctrl.receive)

module.exports = router
