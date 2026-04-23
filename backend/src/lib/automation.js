const prisma = require('../lib/prisma');
const { createNotification, logActivity } = require('../controllers/notifications');

/**
 * AUTOMATION ENGINE
 * Trigger → Condition → Action
 *
 * Events:
 *   deal.won         → create client + project, notify team
 *   payment.received → update revenue log, notify finance
 *   expense.added    → update profit snapshot
 *   task.assigned    → notify assignee
 *   invoice.overdue  → notify finance manager
 *   milestone.missed → notify project manager
 */

class AutomationEngine {
  constructor(io) {
    this.io = io;
  }

  // ─── DEAL WON ──────────────────────────────────────────────────────────────
  async onDealWon(deal, actorUserId) {
    const io = this.io;
    try {
      // 1. Auto-create Client if not exists
      let client = deal.client;
      if (!client && deal.lead?.email) {
        client = await prisma.client.upsert({
          where: { email: deal.lead.email },
          update: {},
          create: {
            name: deal.lead.name,
            email: deal.lead.email,
            phone: deal.lead.phone,
            company: deal.lead.name,
          },
        }).catch(() => null);
      }

      // 2. Auto-create Project
      if (deal.id) {
        const existingProject = await prisma.project.findFirst({ where: { deal_id: deal.id } });
        if (!existingProject) {
          const project = await prisma.project.create({
            data: {
              title: `Project: ${deal.lead?.name || 'New Project'}`,
              description: `Auto-created from won deal #${deal.id}`,
              client_id: client?.id || deal.client_id || null,
              deal_id: deal.id,
              type: 'ICT',
              status: 'PLANNING',
              budget: deal.value ? parseFloat(deal.value) : null,
              created_by: actorUserId,
            },
          });

          io?.emit('project:auto_created', project);

          // Notify super admins and project managers
          const managers = await prisma.user.findMany({
            where: { role: { in: ['SUPER_ADMIN', 'PROJECT_MANAGER'] }, status: 'ACTIVE' },
          });
          for (const mgr of managers) {
            await createNotification(prisma, io, {
              user_id: mgr.id,
              type: 'SUCCESS',
              title: '🎉 New Project Created',
              message: `Deal won! Project "${project.title}" created automatically.`,
              link: `/projects/${project.id}`,
            });
          }
        }
      }

      // 3. Log activity
      await logActivity(prisma, {
        user_id: actorUserId,
        action: 'DEAL_WON',
        module: 'deals',
        entity_id: deal.id,
        entity_type: 'Deal',
        description: `Deal #${deal.id} marked as WON — auto-project created`,
        deal_id: deal.id,
        client_id: client?.id,
      });

    } catch (err) {
      console.error('[Automation] onDealWon error:', err.message);
    }
  }

  // ─── PAYMENT RECEIVED ──────────────────────────────────────────────────────
  async onPaymentReceived(payment, actorUserId) {
    const io = this.io;
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: payment.invoice_id },
        include: { client: { select: { name: true } }, project: { select: { id: true, title: true } } },
      });

      // Notify finance team
      const financeUsers = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'FINANCE_MANAGER'] }, status: 'ACTIVE' },
      });
      for (const u of financeUsers) {
        await createNotification(prisma, io, {
          user_id: u.id,
          type: 'SUCCESS',
          title: '💰 Payment Received',
          message: `$${parseFloat(payment.amount_paid).toLocaleString()} received from ${invoice?.client?.name || 'client'}`,
          link: `/finance/payments`,
        });
      }

      io?.emit('payment:received', { payment, invoice });

      await logActivity(prisma, {
        user_id: actorUserId,
        action: 'PAYMENT_RECEIVED',
        module: 'finance',
        entity_id: payment.id,
        entity_type: 'Payment',
        description: `Payment of $${payment.amount_paid} received for invoice ${invoice?.invoice_number}`,
      });
    } catch (err) {
      console.error('[Automation] onPaymentReceived error:', err.message);
    }
  }

  // ─── TASK ASSIGNED ─────────────────────────────────────────────────────────
  async onTaskAssigned(task, assigneeId, actorUserId) {
    const io = this.io;
    try {
      if (!assigneeId || assigneeId === actorUserId) return;

      await createNotification(prisma, io, {
        user_id: assigneeId,
        type: 'TASK',
        title: '📋 Task Assigned to You',
        message: `You were assigned: "${task.title}" in project "${task.project?.title || ''}"`,
        link: `/projects/${task.project_id}`,
      });

      io?.to(`user:${assigneeId}`).emit('task:assigned', task);

      await logActivity(prisma, {
        user_id: actorUserId,
        action: 'TASK_ASSIGNED',
        module: 'tasks',
        entity_id: task.id,
        entity_type: 'Task',
        description: `Task "${task.title}" assigned to user #${assigneeId}`,
        task_id: task.id,
        project_id: task.project_id,
      });
    } catch (err) {
      console.error('[Automation] onTaskAssigned error:', err.message);
    }
  }

  // ─── EXPENSE ADDED ─────────────────────────────────────────────────────────
  async onExpenseAdded(expense, actorUserId) {
    try {
      await logActivity(prisma, {
        user_id: actorUserId,
        action: 'EXPENSE_ADDED',
        module: 'finance',
        entity_id: expense.id,
        entity_type: 'Expense',
        description: `Expense "${expense.title}" ($${expense.amount}) added${expense.project_id ? ` to project #${expense.project_id}` : ''}`,
        project_id: expense.project_id,
      });
    } catch (err) {
      console.error('[Automation] onExpenseAdded error:', err.message);
    }
  }

  // ─── MILESTONE MISSED ──────────────────────────────────────────────────────
  async onMilestoneMissed(milestone) {
    const io = this.io;
    try {
      const pms = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'PROJECT_MANAGER'] }, status: 'ACTIVE' },
      });
      for (const pm of pms) {
        await createNotification(prisma, io, {
          user_id: pm.id,
          type: 'WARNING',
          title: '⚠️ Milestone Missed',
          message: `Milestone "${milestone.title}" is past its due date`,
          link: `/projects/${milestone.project_id}`,
        });
      }
    } catch (err) {
      console.error('[Automation] onMilestoneMissed error:', err.message);
    }
  }

  // ─── LEAD CREATED ──────────────────────────────────────────────────────────
  async onLeadCreated(lead, actorUserId) {
    try {
      await logActivity(prisma, {
        user_id: actorUserId,
        action: 'LEAD_CREATED',
        module: 'leads',
        entity_id: lead.id,
        entity_type: 'Lead',
        description: `New lead "${lead.name}" created${lead.source ? ` from ${lead.source}` : ''}`,
        lead_id: lead.id,
      });
    } catch (err) {
      console.error('[Automation] onLeadCreated error:', err.message);
    }
  }
}

module.exports = AutomationEngine;
