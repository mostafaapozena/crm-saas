const express = require('express');
const router = express.Router();
const { getFinanceSummary, getProjectProfit, getRevenueReport, getExpensesReport, getProfitReport } = require('../controllers/finance');
const { authenticate } = require('../middleware/auth');
const { requireFinance } = require('../middleware/finance');

router.use(authenticate, requireFinance);
router.get('/summary', getFinanceSummary);
router.get('/project-profit/:project_id', getProjectProfit);
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/expenses', getExpensesReport);
router.get('/reports/profit', getProfitReport);

module.exports = router;
