require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const AutomationEngine = require('./lib/automation');
const { startSyncScheduler } = require('./lib/sync');

// ── Phase 1 ──────────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const leadRoutes       = require('./routes/leads');
const clientRoutes     = require('./routes/clients');
const dealRoutes       = require('./routes/deals');
const dashboardRoutes  = require('./routes/dashboard');
const userRoutes       = require('./routes/users');
// ── Phase 2 ──────────────────────────────────────────────────────────────────
const projectRoutes    = require('./routes/projects');
const taskRoutes       = require('./routes/tasks');
const teamRoutes       = require('./routes/team');
const milestoneRoutes  = require('./routes/milestones');
// ── Phase 3 ──────────────────────────────────────────────────────────────────
const invoiceRoutes    = require('./routes/invoices');
const paymentRoutes    = require('./routes/payments');
const expenseRoutes    = require('./routes/expenses');
const financeRoutes    = require('./routes/finance');
const payrollRoutes    = require('./routes/payroll');
// ── Phase 4 ──────────────────────────────────────────────────────────────────
const campaignRoutes   = require('./routes/campaigns');
const procurementRoutes = require('./routes/procurement');
const notifRoutes      = require('./routes/notifications');
// ── Phase 5 ──────────────────────────────────────────────────────────────────
const productsRoutes    = require('./routes/products');
const inventoryRoutes   = require('./routes/inventory');
const posRoutes         = require('./routes/pos');
const posPurchasesRoutes = require('./routes/posPurchases');
const deliveriesRoutes  = require('./routes/deliveries');
const posReportsRoutes  = require('./routes/posReports');
// ── Phase 6: Financial Decision Engine ───────────────────────────────────────
const businessUnitsRoutes  = require('./routes/businessUnits');
const fixedCostsRoutes     = require('./routes/fixedCosts');
const costAllocationRoutes = require('./routes/costAllocation');
const cogsRoutes           = require('./routes/cogs');
const pnlRoutes            = require('./routes/pnl');
const cashFlowRoutes       = require('./routes/cashFlow');
// ── Marketing OAuth & Accounts ────────────────────────────────────────────────
const marketingOAuthRoutes    = require('./routes/marketingOAuth');
const marketingAccountsRoutes = require('./routes/marketingAccounts');
// ── Dashboards ───────────────────────────────────────────────────────────────
const { getProjectsSummary } = require('./controllers/projectsDashboard');
const { getCEODashboard }    = require('./controllers/ceoDashboard');
const { authenticate }       = require('./middleware/auth');
const logger                 = require('./middleware/logger');

const app        = express();
const httpServer = createServer(app);
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001']
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('CORS blocked'))),
  credentials: true,
};

const io         = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

// Automation engine
const automation = new AutomationEngine(io);
app.set('io', io);
app.set('automation', automation);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Serve uploaded creatives statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok', system: 'CAI2RUS Business OS', modules: 22, phase: '6' }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',          authRoutes);
app.use('/leads',         leadRoutes);
app.use('/clients',       clientRoutes);
app.use('/deals',         dealRoutes);
app.use('/dashboard',     dashboardRoutes);
app.use('/users',         userRoutes);
app.use('/projects',      projectRoutes);
app.use('/tasks',         taskRoutes);
app.use('/team',          teamRoutes);
app.use('/milestones',    milestoneRoutes);
app.use('/invoices',      invoiceRoutes);
app.use('/payments',      paymentRoutes);
app.use('/expenses',      expenseRoutes);
app.use('/finance',       financeRoutes);
app.use('/payroll',       payrollRoutes);
app.use('/campaigns',     campaignRoutes);
app.use('/procurement',   procurementRoutes);
app.use('/notifications', notifRoutes);
app.use('/products',      productsRoutes);
app.use('/inventory',     inventoryRoutes);
app.use('/pos',           posRoutes);
app.use('/pos-purchases', posPurchasesRoutes);
app.use('/deliveries',    deliveriesRoutes);
app.use('/pos-reports',   posReportsRoutes);
// ── Phase 6 ───────────────────────────────────────────────────────────────────
app.use('/business-units',    businessUnitsRoutes);
app.use('/fixed-costs',       fixedCostsRoutes);
app.use('/cost-allocation',   costAllocationRoutes);
app.use('/cogs',              cogsRoutes);
app.use('/pnl',               pnlRoutes);
app.use('/cash-flow',         cashFlowRoutes);
// ── Marketing OAuth & Accounts ────────────────────────────────────────────────
app.use('/marketing-oauth',    marketingOAuthRoutes);
app.use('/marketing-accounts', marketingAccountsRoutes);

// ── Dashboard endpoints ───────────────────────────────────────────────────────
app.get('/dashboard/projects-summary', authenticate, getProjectsSummary);
app.get('/dashboard/ceo',              authenticate, getCEODashboard);

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} in room`);
  });
  socket.on('disconnect', () => console.log('⚡ Disconnected:', socket.id));
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`CAI2RUS Enterprise OS — port ${PORT} — 22 modules active (Phase 6)`);
  console.log('Finance Engine: P&L | Cash Flow | COGS | Fixed Costs | Allocation | Business Units');
  startSyncScheduler(io);
});
module.exports = { app, io, automation };
