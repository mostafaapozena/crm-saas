const prisma = require('../lib/prisma');
const { log, notify } = require('../lib/activityLogger');
const { buildScopeFilter } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

const createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source, stage, deal_value, probability, campaign_id, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Lead name is required' });
    const validStages = ['LEAD', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'];
    const lead = await prisma.lead.create({
      data: {
        name, phone, email, source, notes,
        stage: validStages.includes(stage) ? stage : 'LEAD',
        deal_value: deal_value ? parseFloat(deal_value) : null,
        probability: probability ? parseInt(probability) : 0,
        campaign_id: campaign_id ? parseInt(campaign_id) : null,
        created_by: req.user.id,
      },
      include: { creator: { select: { id: true, name: true } }, campaign: { select: { id: true, title: true } } },
    });
    req.app.get('io')?.emit('lead:created', lead);
    req.app.get('automation')?.onLeadCreated(lead, req.user.id);
    await log({ user_id: req.user.id, action: 'CREATE', module: 'leads', entity_id: lead.id, entity_type: 'Lead', description: `Created lead: ${lead.name}` });
    res.status(201).json(lead);
  } catch (err) { next(err); }
};

const getLeads = async (req, res, next) => {
  try {
    const { stage, search, campaign_id, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (stage) where.stage = stage;
    if (campaign_id) where.campaign_id = parseInt(campaign_id);
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }];

    // RBAC data filter — scope is set by authorizeRbac middleware
    const scopeFilter = buildScopeFilter(MODULES.CRM, req);
    Object.assign(where, scopeFilter);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where, skip, take: parseInt(limit),
        include: { creator: { select: { id: true, name: true } }, campaign: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);
    res.json({ leads, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, source, stage, deal_value, probability, campaign_id, notes } = req.body;
    const existing = await prisma.lead.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const lead = await prisma.lead.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }), ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }), ...(source !== undefined && { source }),
        ...(stage && { stage }), ...(deal_value !== undefined && { deal_value: parseFloat(deal_value) }),
        ...(probability !== undefined && { probability: parseInt(probability) }),
        ...(campaign_id !== undefined && { campaign_id: campaign_id ? parseInt(campaign_id) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    // Auto-create client when WON
    if (stage === 'WON' && existing.stage !== 'WON' && lead.email) {
      await prisma.client.upsert({
        where: { email: lead.email },
        update: {},
        create: { name: lead.name, email: lead.email, phone: lead.phone },
      }).catch(() => null);
    }

    req.app.get('io')?.emit('lead:updated', lead);
    await log({ user_id: req.user.id, action: 'UPDATE', module: 'leads', entity_id: lead.id, entity_type: 'Lead', description: `Updated lead: ${lead.name}${stage ? ` → ${stage}` : ''}` });
    if (stage === 'WON' && existing.stage !== 'WON') {
      await notify(req.app.get('io'), { user_id: req.user.id, type: 'SUCCESS', title: 'Lead Won', message: `Lead "${lead.name}" marked as WON` });
    }
    res.json(lead);
  } catch (err) { next(err); }
};

const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.lead.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });
    await prisma.lead.delete({ where: { id: parseInt(id) } });
    req.app.get('io')?.emit('lead:deleted', { id: parseInt(id) });
    await log({ user_id: req.user.id, action: 'DELETE', module: 'leads', entity_id: parseInt(id), entity_type: 'Lead', description: `Deleted lead: ${existing.name}` });
    res.json({ message: 'Lead deleted' });
  } catch (err) { next(err); }
};

module.exports = { createLead, getLeads, updateLead, deleteLead };
