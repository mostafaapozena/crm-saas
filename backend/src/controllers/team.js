const prisma = require('../lib/prisma');

const getTeam = async (req, res, next) => {
  try {
    const { department, role, status, search } = req.query;

    const where = {};
    if (department) where.department = { contains: department };
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }];

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        department: true, status: true, createdAt: true,
        tasksAssigned: {
          select: { id: true, status: true, priority: true, due_date: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Enrich with workload count
    const team = users.map((u) => ({
      ...u,
      workload_count: u.tasksAssigned.filter(t => t.status !== 'DONE').length,
      tasks_done: u.tasksAssigned.filter(t => t.status === 'DONE').length,
      tasks_overdue: u.tasksAssigned.filter(
        t => t.status !== 'DONE' && t.due_date && new Date(t.due_date) < new Date()
      ).length,
    }));

    res.json(team);
  } catch (err) { next(err); }
};

const getMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, status: true, createdAt: true,
        tasksAssigned: {
          include: {
            project: { select: { id: true, title: true, status: true } },
          },
          orderBy: { due_date: 'asc' },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'Team member not found' });
    res.json(user);
  } catch (err) { next(err); }
};

const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, department, status } = req.body;

    const VALID_ROLES = ['SUPER_ADMIN', 'SALES', 'MARKETING', 'FINANCE', 'DESIGNER', 'PROJECT_MANAGER', 'ENGINEER'];
    const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(role && VALID_ROLES.includes(role) && { role }),
        ...(department !== undefined && { department }),
        ...(status && VALID_STATUSES.includes(status) && { status }),
      },
      select: { id: true, name: true, email: true, role: true, department: true, status: true },
    });

    res.json(user);
  } catch (err) { next(err); }
};

module.exports = { getTeam, getMember, updateMember };
