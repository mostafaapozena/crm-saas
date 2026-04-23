const express = require('express');

// Import route modules
const authRoutes       = require('./routes/auth');
const leadRoutes       = require('./routes/leads');
const clientRoutes     = require('./routes/clients');
const dealRoutes       = require('./routes/deals');
const dashboardRoutes  = require('./routes/dashboard');
const userRoutes       = require('./routes/users');
const projectRoutes    = require('./routes/projects');
const taskRoutes       = require('./routes/tasks');
const teamRoutes       = require('./routes/team');
const milestoneRoutes  = require('./routes/milestones');
const invoiceRoutes    = require('./routes/invoices');
const paymentRoutes    = require('./routes/payments');
const expenseRoutes    = require('./routes/expenses');
const financeRoutes    = require('./routes/finance');
const payrollRoutes    = require('./routes/payroll');
const campaignRoutes   = require('./routes/campaigns');
const procurementRoutes = require('./routes/procurement');
const notifRoutes      = require('./routes/notifications');
const productsRoutes   = require('./routes/products');
const inventoryRoutes  = require('./routes/inventory');
const posRoutes        = require('./routes/pos');
const posPurchasesRoutes = require('./routes/posPurchases');
const deliveriesRoutes = require('./routes/deliveries');
const posReportsRoutes = require('./routes/posReports');
const businessUnitsRoutes  = require('./routes/businessUnits');
const fixedCostsRoutes     = require('./routes/fixedCosts');
const costAllocationRoutes = require('./routes/costAllocation');
const cogsRoutes           = require('./routes/cogs');
const pnlRoutes            = require('./routes/pnl');
const cashFlowRoutes       = require('./routes/cashFlow');
const marketingOAuthRoutes    = require('./routes/marketingOAuth');
const marketingAccountsRoutes = require('./routes/marketingAccounts');

const apiRouter = express.Router();

// Health endpoint for production readiness
apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

// Phase 1-6 routes mounted under /api
apiRouter.use('/auth',           authRoutes);
apiRouter.use('/leads',          leadRoutes);
apiRouter.use('/clients',        clientRoutes);
apiRouter.use('/deals',          dealRoutes);
apiRouter.use('/dashboard',      dashboardRoutes);
apiRouter.use('/users',          userRoutes);
apiRouter.use('/projects',       projectRoutes);
apiRouter.use('/tasks',          taskRoutes);
apiRouter.use('/team',           teamRoutes);
apiRouter.use('/milestones',     milestoneRoutes);
apiRouter.use('/invoices',       invoiceRoutes);
apiRouter.use('/payments',       paymentRoutes);
apiRouter.use('/expenses',       expenseRoutes);
apiRouter.use('/finance',        financeRoutes);
apiRouter.use('/payroll',        payrollRoutes);
apiRouter.use('/campaigns',      campaignRoutes);
apiRouter.use('/procurement',    procurementRoutes);
apiRouter.use('/notifications',  notifRoutes);
apiRouter.use('/products',       productsRoutes);
apiRouter.use('/inventory',      inventoryRoutes);
apiRouter.use('/pos',            posRoutes);
apiRouter.use('/pos-purchases',  posPurchasesRoutes);
apiRouter.use('/deliveries',     deliveriesRoutes);
apiRouter.use('/pos-reports',    posReportsRoutes);
module.exports = apiRouter;
