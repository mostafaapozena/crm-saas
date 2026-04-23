const prisma = require('../lib/prisma');
const { log, notify } = require('../lib/activityLogger');
const { SCOPES } = require('../config/rbac');

const dealInclude = {
  lead: { select: { id: true, name: true, email: true, phone: true, stage: true } },
  client: { select: { id: true, name: true, company: true } },
};

const createDeal = async (req, res, next) => {
  try {
    const { lead_id, client_id, value, status, expected_close_date, notes } = req.body;
    const validStatuses = ['ACTIVE', 'WON', 'LOST', 'ON_HOLD'];
    const deal = await prisma.deal.create({
      data: {
        lead_id: lead_id ? parseInt(lead_id) : null,
        client_id: client_id ? parseInt(client_id) : null,
        value: value ? parseFloat(value) : null,
        status: validStatuses.includes(status) ? status : 'ACTIVE',
        expected_close_date: expected_close_date ? new Date(expected_close_date) : null,
        notes,
      },
      include: dealInclude,
    });
    req.app.get('io')?.emit('deal:created', deal);
    if (deal.status === 'WON') {
      req.app.get('automation')?.onDealWon(deal, req.user.id);
    }
    await log({ user_id: req.user.id, action: 'CREATE', module: 'deals', entity_id: deal.id, entity_type: 'Deal', description: `Created deal worth $${deal.value || 0}` });
    res.status(201).json(deal);
  } catch (err) { next(err); }
};

const getDeals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status } : {};

    // RBAC: OWN scope → only deals linked to leads this user created
    // Deal has no created_by, so we join through leads
    if (req.permissionScope === SCOPES.OWN) {
      const myLeads = await prisma.lead.findMany({
        where: { created_by: req.user.id },
        select: { id: true },
      });
      where.lead_id = myLeads.length ? { in: myLeads.map(l => l.id) } : -1;
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({ where, skip, take: parseInt(limit), include: dealInclude, orderBy: { createdAt: 'desc' } }),
      prisma.deal.count({ where }),
    ]);
    res.json({ deals, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const updateDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lead_id, client_id, value, status, expected_close_date, notes } = req.body;
    const existing = await prisma.deal.findUnique({ where: { id: parseInt(id) }, include: dealInclude });
    if (!existing) return res.status(404).json({ error: 'Deal not found' });

    const deal = await prisma.deal.update({
      where: { id: parseInt(id) },
      data: {
        ...(lead_id !== undefined && { lead_id: lead_id ? parseInt(lead_id) : null }),
        ...(client_id !== undefined && { client_id: client_id ? parseInt(client_id) : null }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(status && { status }),
        ...(expected_close_date !== undefined && { expected_close_date: expected_close_date ? new Date(expected_close_date) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: dealInclude,
    });

    req.app.get('io')?.emit('deal:updated', deal);
    if (status === 'WON' && existing.status !== 'WON') {
      req.app.get('automation')?.onDealWon(deal, req.user.id);
      await notify(req.app.get('io'), { user_id: req.user.id, type: 'SUCCESS', title: 'Deal Won!', message: `Deal worth $${deal.value || 0} has been marked as WON` });
    }
    await log({ user_id: req.user.id, action: 'UPDATE', module: 'deals', entity_id: deal.id, entity_type: 'Deal', description: `Updated deal${status ? ` → ${status}` : ''}` });
    res.json(deal);
  } catch (err) { next(err); }
};

module.exports = { createDeal, getDeals, updateDeal };
