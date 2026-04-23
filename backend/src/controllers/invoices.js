const prisma = require('../lib/prisma');
const { log } = require('../lib/activityLogger');

const FINANCE_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT'];

const genInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

const invoiceInclude = {
  client: { select: { id: true, name: true, company: true, email: true } },
  project: { select: { id: true, title: true } },
  deal: { select: { id: true, value: true } },
  creator: { select: { id: true, name: true } },
  payments: true,
};

const createInvoice = async (req, res, next) => {
  try {
    const { client_id, project_id, deal_id, amount, tax = 0, status, issued_date, due_date, notes } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!amount) return res.status(400).json({ error: 'amount is required' });
    if (!project_id && !deal_id) return res.status(400).json({ error: 'Must link to a project or deal' });

    const amt = parseFloat(amount);
    const taxRate = parseFloat(tax);
    const taxAmount = (amt * taxRate) / 100;
    const total = amt + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        client_id: parseInt(client_id),
        project_id: project_id ? parseInt(project_id) : null,
        deal_id: deal_id ? parseInt(deal_id) : null,
        invoice_number: await genInvoiceNumber(),
        amount: amt,
        tax: taxRate,
        total_amount: total,
        status: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status) ? status : 'DRAFT',
        issued_date: issued_date ? new Date(issued_date) : new Date(),
        due_date: due_date ? new Date(due_date) : null,
        notes: notes || null,
        created_by: req.user.id,
      },
      include: invoiceInclude,
    });

    req.app.get('io')?.emit('invoice:created', invoice);
    await log({ user_id: req.user.id, action: 'CREATE', module: 'finance', entity_id: invoice.id, entity_type: 'Invoice', description: `Created invoice ${invoice.invoice_number} — $${invoice.total_amount}` });
    res.status(201).json(invoice);
  } catch (err) { next(err); }
};

const getInvoices = async (req, res, next) => {
  try {
    const { status, client_id, project_id, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (client_id) where.client_id = parseInt(client_id);
    if (project_id) where.project_id = parseInt(project_id);

    // Finance sees all; others see only their client's invoices via deals
    if (!FINANCE_ROLES.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') {
      // Sales can see invoices linked to their deals
      if (req.user.role === 'SALES') {
        const myLeads = await prisma.lead.findMany({ where: { created_by: req.user.id }, select: { deals: { select: { id: true } } } });
        const dealIds = myLeads.flatMap(l => l.deals.map(d => d.id));
        where.deal_id = { in: dealIds };
      } else {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({ where, skip, take: parseInt(limit), include: invoiceInclude, orderBy: { createdAt: 'desc' } }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const getInvoice = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: invoiceInclude,
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { next(err); }
};

const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, tax, status, due_date, notes, issued_date } = req.body;

    const existing = await prisma.invoice.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

    const data = {};
    if (amount !== undefined) {
      const amt = parseFloat(amount);
      const taxRate = tax !== undefined ? parseFloat(tax) : parseFloat(existing.tax);
      data.amount = amt;
      data.tax = taxRate;
      data.total_amount = amt + (amt * taxRate) / 100;
    }
    if (status) data.status = status;
    if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
    if (issued_date !== undefined) data.issued_date = issued_date ? new Date(issued_date) : new Date();
    if (notes !== undefined) data.notes = notes;

    const invoice = await prisma.invoice.update({ where: { id: parseInt(id) }, data, include: invoiceInclude });
    req.app.get('io')?.emit('invoice:updated', invoice);
    res.json(invoice);
  } catch (err) { next(err); }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    if (existing.status === 'PAID') return res.status(400).json({ error: 'Cannot delete a paid invoice' });
    await prisma.invoice.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Invoice deleted' });
  } catch (err) { next(err); }
};

module.exports = { createInvoice, getInvoices, getInvoice, updateInvoice, deleteInvoice };
