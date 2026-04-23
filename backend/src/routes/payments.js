const express = require('express');
const router = express.Router();
const { createPayment, getPayments, getPayment } = require('../controllers/payments');
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');

router.use(authenticate, requireFinance);
router.get('/', getPayments);
router.post('/', createPayment);
router.get('/:id', getPayment);

module.exports = router;
