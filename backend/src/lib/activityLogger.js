const prisma = require('./prisma');

/**
 * Write a row to activity_logs. Non-blocking — never throws.
 */
async function log({ user_id, action, module, entity_id, entity_type, description }) {
  return prisma.activityLog.create({
    data: { user_id, action, module, entity_id, entity_type, description },
  }).catch(() => null);
}

/**
 * Create a DB notification and push via Socket.io. Non-blocking — never throws.
 */
async function notify(io, { user_id, type = 'INFO', title, message, link }) {
  const n = await prisma.notification.create({
    data: { user_id, type, title, message, link: link || null },
  }).catch(() => null);
  if (n) io?.to(`user:${user_id}`).emit('notification', n);
  return n;
}

module.exports = { log, notify };
