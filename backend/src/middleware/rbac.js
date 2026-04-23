const { SCOPES, MODULES, RBAC_MATRIX } = require('../config/rbac');

/**
 * Route-level permission gate.
 * Sets req.permissionScope and req.rbacModule for downstream controllers.
 */
const authorizeRbac = (module, action) => (req, res, next) => {
  const userRole = req.user?.role;

  if (!userRole) {
    return res.status(401).json({ error: 'Unauthorized: No role' });
  }

  const roleConfig = RBAC_MATRIX[userRole];
  if (!roleConfig) {
    return res.status(403).json({ error: 'Invalid role mapping' });
  }

  const moduleConfig = roleConfig[module];

  if (!moduleConfig || moduleConfig.scope === SCOPES.NONE || !moduleConfig.actions.length) {
    return res.status(403).json({ error: `Access denied: ${userRole} cannot access ${module}` });
  }

  if (!moduleConfig.actions.includes(action)) {
    return res.status(403).json({ error: `Action '${action}' not permitted for ${userRole}` });
  }

  // FOUNDER_CEO always reads everything but cannot write to security-sensitive modules
  req.permissionScope = userRole === 'FOUNDER_CEO' ? SCOPES.ALL : moduleConfig.scope;
  req.rbacModule = module;
  next();
};

/**
 * Returns a Prisma-compatible WHERE clause that restricts a query to
 * what the current user is permitted to see, based on their scope in
 * the given module.
 *
 * Must be called AFTER authorizeRbac so req.permissionScope is set.
 */
const buildScopeFilter = (module, req) => {
  const scope = req.permissionScope;
  const userId = req.user.id;
  const orgId  = req.user.organization_id;

  if (!scope || scope === SCOPES.ALL) return {};
  // Hard deny — no record should be returned (impossible id)
  if (scope === SCOPES.NONE) return { id: -1 };

  switch (module) {
    // ── CRM ─────────────────────────────────────────────────────────────
    case MODULES.CRM:
      if (scope === SCOPES.OWN)  return { created_by: userId };
      if (scope === SCOPES.TEAM) return orgId ? { organization_id: orgId } : {};
      return {};

    // ── PROJECTS ─────────────────────────────────────────────────────────
    case MODULES.PROJECTS:
      if (scope === SCOPES.OWN) return { created_by: userId };
      if (scope === SCOPES.ASSIGNED) return {
        OR: [
          { created_by: userId },
          { tasks: { some: { assigned_to: userId } } },
        ],
      };
      if (scope === SCOPES.TEAM) return orgId ? { organization_id: orgId } : {};
      return {};

    // ── TASKS ─────────────────────────────────────────────────────────────
    case MODULES.TASKS:
      if (scope === SCOPES.OWN || scope === SCOPES.ASSIGNED) return {
        OR: [{ assigned_to: userId }, { created_by: userId }],
      };
      if (scope === SCOPES.TEAM) return orgId ? { organization_id: orgId } : {};
      return {};

    // ── MARKETING ────────────────────────────────────────────────────────
    case MODULES.MARKETING:
      if (scope === SCOPES.ASSIGNED) return { created_by: userId };
      if (scope === SCOPES.TEAM) return orgId ? { organization_id: orgId } : {};
      return {};

    // ── FINANCE ──────────────────────────────────────────────────────────
    case MODULES.FINANCE:
      if (scope === SCOPES.OWN || scope === SCOPES.ASSIGNED) return { created_by: userId };
      return {};

    // ── POS ──────────────────────────────────────────────────────────────
    case MODULES.POS:
      if (scope === SCOPES.OWN)      return { cashier_id: userId };
      if (scope === SCOPES.ASSIGNED) return { driver_id: userId };
      return {};

    default:
      return {};
  }
};

// Legacy alias — kept so existing code that calls getScopeFilter() still works
const getScopeFilter = (req) => buildScopeFilter(req.rbacModule || MODULES.CRM, req);

module.exports = { authorizeRbac, buildScopeFilter, getScopeFilter };
