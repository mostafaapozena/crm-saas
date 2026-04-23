const prisma = require('../lib/prisma');

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED'];

const createMilestone = async (req, res, next) => {
  try {
    const { title, description, project_id, status, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!project_id) return res.status(400).json({ error: 'project_id is required' });

    const milestone = await prisma.milestone.create({
      data: {
        title, description,
        project_id: parseInt(project_id),
        created_by: req.user.id,
        status: VALID_STATUSES.includes(status) ? status : 'PENDING',
        due_date: due_date ? new Date(due_date) : null,
      },
      include: { project: { select: { id: true, title: true } }, creator: { select: { id: true, name: true } } },
    });

    req.app.get('io')?.emit('milestone:created', milestone);
    res.status(201).json(milestone);
  } catch (err) { next(err); }
};

const getMilestones = async (req, res, next) => {
  try {
    const { project_id, status } = req.query;
    const where = {};
    if (project_id) where.project_id = parseInt(project_id);
    if (status) where.status = status;

    const milestones = await prisma.milestone.findMany({
      where,
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { due_date: 'asc' },
    });
    res.json(milestones);
  } catch (err) { next(err); }
};

const updateMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, due_date, completed_date } = req.body;

    const existing = await prisma.milestone.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Milestone not found' });

    const milestone = await prisma.milestone.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && VALID_STATUSES.includes(status) && { status }),
        ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
        ...(completed_date !== undefined && { completed_date: completed_date ? new Date(completed_date) : null }),
      },
      include: { project: { select: { id: true, title: true } }, creator: { select: { id: true, name: true } } },
    });

    req.app.get('io')?.emit('milestone:updated', milestone);
    res.json(milestone);
  } catch (err) { next(err); }
};

const deleteMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.milestone.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Milestone deleted' });
  } catch (err) { next(err); }
};

module.exports = { createMilestone, getMilestones, updateMilestone, deleteMilestone };
