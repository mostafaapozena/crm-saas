const prisma = require('../lib/prisma');
const { log } = require('../lib/activityLogger');

const VALID_CATEGORIES = ['ADS', 'VENDOR', 'SALARY', 'TOOLS', 'TRAVEL', 'UTILITIES', 'OTHER'];

const expenseInclude = {
  project: { select: { id: true, title: true } },
  creator: { select: { id: true, name: true } },
};

const createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, project_id, date, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!amount) return res.status(400).json({ error: 'amount is required' });

    const expense = await prisma.expense.create({
      data: {
        title,
        category: VALID_CATEGORIES.includes(category) ? category : 'OTHER',
        amount: parseFloat(amount),
        project_id: project_id ? parseInt(project_id) : null,
        created_by: req.user.id,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
      include: expenseInclude,
    });

    req.app.get('io')?.emit('expense:created', expense);
    req.app.get('automation')?.onExpenseAdded(expense, req.user.id);
    await log({ user_id: req.user.id, action: 'CREATE', module: 'finance', entity_id: expense.id, entity_type: 'Expense', description: `Added expense: ${expense.title} — $${expense.amount}` });
    res.status(201).json(expense);
  } catch (err) { next(err); }
};

const getExpenses = async (req, res, next) => {
  try {
    const { category, project_id, page = 1, limit = 20, from, to } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (category) where.category = category;
    if (project_id) where.project_id = parseInt(project_id);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [expenses, total, sumResult] = await Promise.all([
      prisma.expense.findMany({ where, skip, take: parseInt(limit), include: expenseInclude, orderBy: { date: 'desc' } }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    res.json({
      expenses,
      totalAmount: parseFloat(sumResult._sum.amount || 0),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
};

const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, category, amount, project_id, date, notes } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(category && VALID_CATEGORIES.includes(category) && { category }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(project_id !== undefined && { project_id: project_id ? parseInt(project_id) : null }),
        ...(date !== undefined && { date: date ? new Date(date) : new Date() }),
        ...(notes !== undefined && { notes }),
      },
      include: expenseInclude,
    });

    res.json(expense);
  } catch (err) { next(err); }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    await prisma.expense.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Expense deleted' });
  } catch (err) { next(err); }
};

module.exports = { createExpense, getExpenses, updateExpense, deleteExpense };
