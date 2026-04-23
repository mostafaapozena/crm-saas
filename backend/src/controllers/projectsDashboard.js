const prisma = require('../lib/prisma');

const getProjectsSummary = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalTasks,
      overdueTasks,
      doneTasks,
      projectsByStatus,
      projectsByType,
      recentProjects,
      teamWorkload,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.project.count({ where: { status: 'ON_HOLD' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: { not: 'DONE' }, due_date: { lt: now } } }),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.project.groupBy({ by: ['type'], _count: { id: true } }),
      prisma.project.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { name: true, company: true } },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.user.findMany({
        select: {
          id: true, name: true, role: true, department: true,
          tasksAssigned: {
            where: { status: { not: 'DONE' } },
            select: { id: true, priority: true },
          },
        },
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      }),
    ]);

    const avgProgress = await prisma.project.aggregate({ _avg: { progress_percentage: true } });

    res.json({
      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        totalTasks,
        overdueTasks,
        doneTasks,
        avgProgress: Math.round(avgProgress._avg.progress_percentage || 0),
        taskCompletionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      },
      projectsByStatus: projectsByStatus.map(s => ({ status: s.status, count: s._count.id })),
      projectsByType: projectsByType.map(t => ({ type: t.type, count: t._count.id })),
      recentProjects,
      teamWorkload: teamWorkload.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        department: u.department,
        activeTasks: u.tasksAssigned.length,
        highPriority: u.tasksAssigned.filter(t => t.priority === 'HIGH').length,
      })),
    });
  } catch (err) { next(err); }
};

module.exports = { getProjectsSummary };
