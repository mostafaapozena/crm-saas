const prisma = require('../lib/prisma');
const { log, notify } = require('../lib/activityLogger');
const { buildScopeFilter } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const taskInclude = {
  project: { select: { id: true, title: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  creator: { select: { id: true, name: true } },
};

// Recalculate project progress based on done tasks ratio
const recalcProgress = async (projectId) => {
  const [total, done] = await Promise.all([
    prisma.task.count({ where: { project_id: projectId } }),
    prisma.task.count({ where: { project_id: projectId, status: 'DONE' } }),
  ]);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  await prisma.project.update({ where: { id: projectId }, data: { progress_percentage: pct } });
  return pct;
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, project_id, assigned_to, status, priority, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Task title is required' });
    if (!project_id) return res.status(400).json({ error: 'project_id is required' });

    const project = await prisma.project.findUnique({ where: { id: parseInt(project_id) } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const task = await prisma.task.create({
      data: {
        title, description,
        project_id: parseInt(project_id),
        assigned_to: assigned_to ? parseInt(assigned_to) : null,
        created_by: req.user.id,
        status: VALID_STATUSES.includes(status) ? status : 'TODO',
        priority: VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM',
        due_date: due_date ? new Date(due_date) : null,
      },
      include: taskInclude,
    });

    const io = req.app.get('io');
    io?.emit('task:created', task);

    if (task.assigned_to) {
      req.app.get('automation')?.onTaskAssigned(task, task.assigned_to, req.user.id);
      await notify(req.app.get('io'), { user_id: task.assigned_to, type: 'TASK', title: 'Task Assigned', message: `You were assigned: "${task.title}"` });
    }
    await log({ user_id: req.user.id, action: 'CREATE', module: 'tasks', entity_id: task.id, entity_type: 'Task', description: `Created task: ${task.title}` });
    await recalcProgress(parseInt(project_id));
    res.status(201).json(task);
  } catch (err) { next(err); }
};

const getTasks = async (req, res, next) => {
  try {
    const { project_id, assigned_to, status, priority, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const scopeFilter = buildScopeFilter(MODULES.TASKS, req);
    const where = { ...scopeFilter };
    if (project_id) where.project_id = parseInt(project_id);
    if (assigned_to) where.assigned_to = parseInt(assigned_to);
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: parseInt(limit),
        include: taskInclude,
        orderBy: [{ priority: 'desc' }, { due_date: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ tasks, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const getTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: taskInclude,
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, status, priority, due_date } = req.body;

    const existing = await prisma.task.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(assigned_to !== undefined && { assigned_to: assigned_to ? parseInt(assigned_to) : null }),
        ...(status && VALID_STATUSES.includes(status) && { status }),
        ...(priority && VALID_PRIORITIES.includes(priority) && { priority }),
        ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
      },
      include: taskInclude,
    });

    const io = req.app.get('io');
    io?.emit('task:updated', task);
    if (task.status === 'DONE') io?.emit('task:completed', task);

    if (assigned_to && assigned_to !== existing.assigned_to) {
      io?.emit(`user:${assigned_to}:assigned`, { task, message: `You were assigned: "${task.title}"` });
      await notify(io, { user_id: parseInt(assigned_to), type: 'TASK', title: 'Task Assigned', message: `You were assigned: "${task.title}"` });
    }
    await log({ user_id: req.user.id, action: 'UPDATE', module: 'tasks', entity_id: task.id, entity_type: 'Task', description: `Updated task: ${task.title}${task.status === 'DONE' ? ' → DONE' : ''}` });
    await recalcProgress(existing.project_id);
    res.json(task);
  } catch (err) { next(err); }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.task.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    await prisma.task.delete({ where: { id: parseInt(id) } });
    await recalcProgress(existing.project_id);
    req.app.get('io')?.emit('task:deleted', { id: parseInt(id), project_id: existing.project_id });
    await log({ user_id: req.user.id, action: 'DELETE', module: 'tasks', entity_id: parseInt(id), entity_type: 'Task', description: `Deleted task: ${existing.title}` });
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
};

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask };
