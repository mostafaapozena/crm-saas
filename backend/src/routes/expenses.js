const express = require('express');
const router = express.Router();
const { createExpense, getExpenses, updateExpense, deleteExpense } = require('../controllers/expenses');
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');

router.use(authenticate, requireFinance);
router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
