const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/products')

router.get('/categories', authenticate, ctrl.listCategories)
router.post('/categories', authenticate, ctrl.createCategory)
router.get('/', authenticate, ctrl.list)
router.get('/:id', authenticate, ctrl.get)
router.post('/', authenticate, ctrl.create)
router.put('/:id', authenticate, ctrl.update)
router.delete('/:id', authenticate, ctrl.softDelete)

module.exports = router
