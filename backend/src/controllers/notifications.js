const prisma = require('../lib/prisma');

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

const getNotifications = async (req, res, next) => {
  try {
    const { unread } = req.query;
    const where = { user_id: req.user.id };
    if (unread === 'true') where.read = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { user_id: req.user.id, read: false } }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await prisma.notification.updateMany({ where: { user_id: req.user.id, read: false }, data: { read: true } });
      return res.json({ message: 'All notifications marked as read' });
    }

    const n = await prisma.notification.update({ where: { id: parseInt(id) }, data: { read: true } });
    res.json(n);
  } catch (err) { next(err); }
};

// Helper — create notification + emit socket
const createNotification = async (prismaClient, io, { user_id, type, title, message, link }) => {
  const n = await prismaClient.notification.create({ data: { user_id, type, title, message, link: link || null } });
  io?.to(`user:${user_id}`).emit('notification', n);
  return n;
};

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────

const getActivityLog = async (req, res, next) => {
  try {
    const { module, entity_type, entity_id, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (module) where.module = module;
    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = parseInt(entity_id);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where, skip, take: parseInt(limit),
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// Helper — log activity
const logActivity = async (prismaClient, { user_id, action, module, entity_id, entity_type, description, metadata, lead_id, deal_id, client_id, project_id, task_id }) => {
  return prismaClient.activityLog.create({
    data: { user_id, action, module, entity_id, entity_type, description, metadata, lead_id, deal_id, client_id, project_id, task_id },
  }).catch(() => null); // Non-blocking
};

module.exports = { getNotifications, markRead, getActivityLog, createNotification, logActivity };
