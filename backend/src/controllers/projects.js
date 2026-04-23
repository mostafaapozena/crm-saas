const prisma = require('../lib/prisma');
const { log } = require('../lib/activityLogger');
const { buildScopeFilter } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

const VALID_STATUSES = ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD'];
const VALID_TYPES = ['MARKETING_CAMPAIGN', 'ICT', 'HYBRID'];

const include = {
  client: { select: { id: true, name: true, company: true } },
  deal: { select: { id: true, value: true, status: true } },
  tasks: {
    select: { id: true, title: true, status: true, priority: true, assignee: { select: { id: true, name: true } } },
  },
};

const createProject = async (req, res, next) => {
  try {
    const { title, description, client_id, deal_id, type, status, budget, progress_percentage, start_date, end_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Project title is required' });

    const project = await prisma.project.create({
      data: {
        title, description,
        client_id: client_id ? parseInt(client_id) : null,
        deal_id: deal_id ? parseInt(deal_id) : null,
        type: VALID_TYPES.includes(type) ? type : 'ICT',
        status: VALID_STATUSES.includes(status) ? status : 'PLANNING',
        budget: budget ? parseFloat(budget) : null,
        progress_percentage: progress_percentage ? parseInt(progress_percentage) : 0,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
      include,
    });

    req.app.get('io')?.emit('project:created', project);
    await log({ user_id: req.user.id, action: 'CREATE', module: 'projects', entity_id: project.id, entity_type: 'Project', description: `Created project: ${project.title}` });
    res.status(201).json(project);
  } catch (err) { next(err); }
};

const getProjects = async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const scopeFilter = buildScopeFilter(MODULES.PROJECTS, req);
    const where = { ...scopeFilter };
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) where.title = { contains: search };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip, take: parseInt(limit),
        include,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const getProject = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        ...include,
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, role: true } },
            creator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
};

const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, client_id, deal_id, type, status, budget, progress_percentage, start_date, end_date } = req.body;

    const existing = await prisma.project.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(client_id !== undefined && { client_id: client_id ? parseInt(client_id) : null }),
        ...(deal_id !== undefined && { deal_id: deal_id ? parseInt(deal_id) : null }),
        ...(type && VALID_TYPES.includes(type) && { type }),
        ...(status && VALID_STATUSES.includes(status) && { status }),
        ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
        ...(progress_percentage !== undefined && { progress_percentage: parseInt(progress_percentage) }),
        ...(start_date !== undefined && { start_date: start_date ? new Date(start_date) : null }),
        ...(end_date !== undefined && { end_date: end_date ? new Date(end_date) : null }),
      },
      include,
    });

    req.app.get('io')?.emit('project:updated', project);
    await log({ user_id: req.user.id, action: 'UPDATE', module: 'projects', entity_id: project.id, entity_type: 'Project', description: `Updated project: ${project.title}${status ? ` → ${status}` : ''}` });
    res.json(project);
  } catch (err) { next(err); }
};

const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.project.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Project not found' });
    await prisma.project.delete({ where: { id: parseInt(id) } });
    req.app.get('io')?.emit('project:deleted', { id: parseInt(id) });
    await log({ user_id: req.user.id, action: 'DELETE', module: 'projects', entity_id: parseInt(id), entity_type: 'Project', description: `Deleted project: ${existing.title}` });
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
};

module.exports = { createProject, getProjects, getProject, updateProject, deleteProject };
