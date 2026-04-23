const SCOPES = {
  ALL:      'ALL',
  TEAM:     'TEAM',
  OWN:      'OWN',
  ASSIGNED: 'ASSIGNED',
  NONE:     'NONE',
};

const MODULES = {
  CRM:         'CRM',
  PROJECTS:    'PROJECTS',
  TASKS:       'TASKS',
  FINANCE:     'FINANCE',
  MARKETING:   'MARKETING',
  GLOBAL:      'GLOBAL',
  POS:         'POS',
  PROCUREMENT: 'PROCUREMENT',
  USERS:       'USERS',
};

// ─────────────────────────────────────────────────────────────────────────────
// RBAC Matrix — O(1) lookup: RBAC_MATRIX[role][module] → { scope, actions }
// Rule: if a module key is absent or scope === NONE → deny
// ─────────────────────────────────────────────────────────────────────────────
const RBAC_MATRIX = {

  // ── 👑 SUPER ADMIN ──────────────────────────────────────────────────────────
  SUPER_ADMIN: {
    [MODULES.CRM]:         { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.PROJECTS]:    { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.TASKS]:       { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.FINANCE]:     { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.MARKETING]:   { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.GLOBAL]:      { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.POS]:         { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.USERS]:       { scope: SCOPES.ALL, actions: ['create', 'read', 'update', 'delete'] },
  },

  // ── 👨‍💼 FOUNDER / CEO ──────────────────────────────────────────────────────
  FOUNDER_CEO: {
    [MODULES.CRM]:         { scope: SCOPES.ALL, actions: ['read', 'update'] },
    [MODULES.PROJECTS]:    { scope: SCOPES.ALL, actions: ['read', 'update'] },
    [MODULES.TASKS]:       { scope: SCOPES.ALL, actions: ['read', 'update'] },
    [MODULES.FINANCE]:     { scope: SCOPES.ALL, actions: ['read', 'update'] },
    [MODULES.MARKETING]:   { scope: SCOPES.ALL, actions: ['read', 'update'] },
    [MODULES.GLOBAL]:      { scope: SCOPES.ALL, actions: ['read'] },
    [MODULES.POS]:         { scope: SCOPES.ALL, actions: ['read', 'update'] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.ALL, actions: ['read'] },
    [MODULES.USERS]:       { scope: SCOPES.ALL, actions: ['read'] },
  },

  // ── 💼 SALES MANAGER ────────────────────────────────────────────────────────
  SALES_MANAGER: {
    [MODULES.CRM]:         { scope: SCOPES.ALL,  actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.PROJECTS]:    { scope: SCOPES.TEAM, actions: ['read', 'update'] },
    [MODULES.TASKS]:       { scope: SCOPES.TEAM, actions: ['read', 'update'] },
    [MODULES.FINANCE]:     { scope: SCOPES.OWN,  actions: ['read'] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE, actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE, actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE, actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE, actions: [] },
  },

  // ── 📞 SALES EXECUTIVE ───────────────────────────────────────────────────────
  SALES_EXECUTIVE: {
    [MODULES.CRM]:         { scope: SCOPES.OWN,      actions: ['create', 'read', 'update'] },
    [MODULES.PROJECTS]:    { scope: SCOPES.OWN,      actions: ['read'] },
    [MODULES.TASKS]:       { scope: SCOPES.ASSIGNED, actions: ['read', 'update'] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE,     actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE,     actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE,     actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE,     actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE,     actions: [] },
  },

  // ── 📣 MARKETING MANAGER ────────────────────────────────────────────────────
  MARKETING_MANAGER: {
    [MODULES.CRM]:         { scope: SCOPES.ALL,  actions: ['read'] },
    [MODULES.PROJECTS]:    { scope: SCOPES.TEAM, actions: ['read', 'update'] },
    [MODULES.TASKS]:       { scope: SCOPES.TEAM, actions: ['read', 'update'] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE, actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.ALL,  actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE, actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE, actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE, actions: [] },
  },

  // ── 🎯 MEDIA BUYER ──────────────────────────────────────────────────────────
  MEDIA_BUYER: {
    [MODULES.CRM]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.NONE,     actions: [] },
    [MODULES.TASKS]:       { scope: SCOPES.ASSIGNED, actions: ['read', 'update'] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE,     actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.ASSIGNED, actions: ['read', 'update'] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE,     actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE,     actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE,     actions: [] },
  },

  // ── 🎨 DESIGNER ─────────────────────────────────────────────────────────────
  DESIGNER: {
    [MODULES.CRM]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.ASSIGNED, actions: ['read'] },
    [MODULES.TASKS]:       { scope: SCOPES.ASSIGNED, actions: ['read', 'update'] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE,     actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE,     actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE,     actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE,     actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE,     actions: [] },
  },

  // ── 🧠 PROJECT MANAGER ──────────────────────────────────────────────────────
  PROJECT_MANAGER: {
    [MODULES.CRM]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.ASSIGNED, actions: ['create', 'read', 'update'] },
    [MODULES.TASKS]:       { scope: SCOPES.ASSIGNED, actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.FINANCE]:     { scope: SCOPES.ASSIGNED, actions: ['read', 'update'] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE,     actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE,     actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.ALL,      actions: ['create', 'read', 'update'] },
    [MODULES.USERS]:       { scope: SCOPES.NONE,     actions: [] },
  },

  // ── 🛠 ENGINEER (ICT) ────────────────────────────────────────────────────────
  ENGINEER: {
    [MODULES.CRM]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.ASSIGNED, actions: ['read'] },
    [MODULES.TASKS]:       { scope: SCOPES.ASSIGNED, actions: ['read', 'update'] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE,     actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE,     actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE,     actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE,     actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE,     actions: [] },
  },

  // ── 💰 FINANCE MANAGER ──────────────────────────────────────────────────────
  FINANCE_MANAGER: {
    [MODULES.CRM]:         { scope: SCOPES.ALL,  actions: ['read'] },
    [MODULES.PROJECTS]:    { scope: SCOPES.ALL,  actions: ['read'] },
    [MODULES.TASKS]:       { scope: SCOPES.ALL,  actions: ['read'] },
    [MODULES.FINANCE]:     { scope: SCOPES.ALL,  actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE, actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE, actions: [] },
    [MODULES.POS]:         { scope: SCOPES.ALL,  actions: ['read'] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.ALL,  actions: ['read'] },
    [MODULES.USERS]:       { scope: SCOPES.NONE, actions: [] },
  },

  // ── 📊 ACCOUNTANT ────────────────────────────────────────────────────────────
  ACCOUNTANT: {
    [MODULES.CRM]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.NONE, actions: [] },
    [MODULES.TASKS]:       { scope: SCOPES.NONE, actions: [] },
    [MODULES.FINANCE]:     { scope: SCOPES.ALL,  actions: ['create', 'read', 'update'] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE, actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE, actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE, actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE, actions: [] },
  },

  // ── 🛒 CASHIER ───────────────────────────────────────────────────────────────
  CASHIER: {
    [MODULES.CRM]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.NONE, actions: [] },
    [MODULES.TASKS]:       { scope: SCOPES.NONE, actions: [] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE, actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE, actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE, actions: [] },
    [MODULES.POS]:         { scope: SCOPES.OWN,  actions: ['create', 'read', 'update'] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE, actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE, actions: [] },
  },

  // ── 📦 WAREHOUSE STAFF ───────────────────────────────────────────────────────
  WAREHOUSE_STAFF: {
    [MODULES.CRM]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.NONE, actions: [] },
    [MODULES.TASKS]:       { scope: SCOPES.NONE, actions: [] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE, actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE, actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE, actions: [] },
    [MODULES.POS]:         { scope: SCOPES.ALL,  actions: ['create', 'read', 'update'] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE, actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE, actions: [] },
  },

  // ── 🚚 DELIVERY DRIVER ───────────────────────────────────────────────────────
  DELIVERY_DRIVER: {
    [MODULES.CRM]:         { scope: SCOPES.NONE,     actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.NONE,     actions: [] },
    [MODULES.TASKS]:       { scope: SCOPES.NONE,     actions: [] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE,     actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE,     actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE,     actions: [] },
    [MODULES.POS]:         { scope: SCOPES.ASSIGNED, actions: ['read', 'update'] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.NONE,     actions: [] },
    [MODULES.USERS]:       { scope: SCOPES.NONE,     actions: [] },
  },

  // ── 🔧 PROCUREMENT OFFICER ───────────────────────────────────────────────────
  PROCUREMENT: {
    [MODULES.CRM]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROJECTS]:    { scope: SCOPES.ALL,  actions: ['read'] },
    [MODULES.TASKS]:       { scope: SCOPES.NONE, actions: [] },
    [MODULES.FINANCE]:     { scope: SCOPES.NONE, actions: [] },
    [MODULES.MARKETING]:   { scope: SCOPES.NONE, actions: [] },
    [MODULES.GLOBAL]:      { scope: SCOPES.NONE, actions: [] },
    [MODULES.POS]:         { scope: SCOPES.NONE, actions: [] },
    [MODULES.PROCUREMENT]: { scope: SCOPES.ALL,  actions: ['create', 'read', 'update', 'delete'] },
    [MODULES.USERS]:       { scope: SCOPES.NONE, actions: [] },
  },
};

module.exports = { SCOPES, MODULES, RBAC_MATRIX };
