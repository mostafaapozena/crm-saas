const FINANCE_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT'];
const INVOICE_WRITE_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER'];

const requireFinance = (req, res, next) => {
  if (!FINANCE_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Finance access required' });
  }
  next();
};

const requireInvoiceWrite = (req, res, next) => {
  if (!INVOICE_WRITE_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Finance Manager or Super Admin required to manage invoices' });
  }
  next();
};

module.exports = { requireFinance, requireInvoiceWrite };
