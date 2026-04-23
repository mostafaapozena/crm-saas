const prisma = require('../lib/prisma');

const createPayroll = async (req, res, next) => {
  try {
    const { user_id, period, basic_salary, bonuses = 0, deductions = 0 } = req.body;
    if (!user_id || !period || !basic_salary) return res.status(400).json({ error: 'user_id, period, basic_salary required' });

    const net = parseFloat(basic_salary) + parseFloat(bonuses) - parseFloat(deductions);

    const payroll = await prisma.payroll.create({
      data: {
        user_id: parseInt(user_id),
        period,
        basic_salary: parseFloat(basic_salary),
        bonuses: parseFloat(bonuses),
        deductions: parseFloat(deductions),
        net_salary: net,
      },
      include: { employee: { select: { id: true, name: true, email: true, role: true, department: true } } },
    });
    res.status(201).json(payroll);
  } catch (err) { next(err); }
};

const getPayroll = async (req, res, next) => {
  try {
    const { period, user_id, status } = req.query;
    const where = {};
    if (period) where.period = period;
    if (user_id) where.user_id = parseInt(user_id);
    if (status) where.status = status;

    const [payrolls, totals] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: { employee: { select: { id: true, name: true, role: true, department: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payroll.aggregate({ where, _sum: { net_salary: true, bonuses: true, deductions: true, basic_salary: true } }),
    ]);

    res.json({
      payrolls,
      totals: {
        totalBasic: parseFloat(totals._sum.basic_salary || 0),
        totalBonuses: parseFloat(totals._sum.bonuses || 0),
        totalDeductions: parseFloat(totals._sum.deductions || 0),
        totalNet: parseFloat(totals._sum.net_salary || 0),
      },
    });
  } catch (err) { next(err); }
};

const updatePayroll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paid_date } = req.body;

    const payroll = await prisma.payroll.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && ['PENDING', 'PROCESSED', 'PAID'].includes(status) && { status }),
        ...(paid_date !== undefined && { paid_date: paid_date ? new Date(paid_date) : null }),
      },
      include: { employee: { select: { id: true, name: true } } },
    });
    res.json(payroll);
  } catch (err) { next(err); }
};

module.exports = { createPayroll, getPayroll, updatePayroll };
