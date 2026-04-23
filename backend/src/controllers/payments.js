const prisma = require('../lib/prisma');
const { log, notify } = require('../lib/activityLogger');

const createPayment = async (req, res, next) => {
  try {
    const { invoice_id, amount_paid, payment_method, payment_date, reference_number, notes } = req.body;
    if (!invoice_id) return res.status(400).json({ error: 'invoice_id is required' });
    if (!amount_paid) return res.status(400).json({ error: 'amount_paid is required' });

    const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(invoice_id) }, include: { payments: true } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot pay a cancelled invoice' });

    const VALID_METHODS = ['BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'CHEQUE', 'CRYPTO', 'OTHER'];

    const payment = await prisma.payment.create({
      data: {
        invoice_id: parseInt(invoice_id),
        amount_paid: parseFloat(amount_paid),
        payment_method: VALID_METHODS.includes(payment_method) ? payment_method : 'BANK_TRANSFER',
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        reference_number: reference_number || null,
        notes: notes || null,
      },
      include: { invoice: { include: { client: { select: { name: true } } } } },
    });

    // Auto-update invoice status to PAID if fully covered
    const totalPaid = invoice.payments.reduce((s, p) => s + parseFloat(p.amount_paid), 0) + parseFloat(amount_paid);
    if (totalPaid >= parseFloat(invoice.total_amount)) {
      await prisma.invoice.update({ where: { id: parseInt(invoice_id) }, data: { status: 'PAID' } });
    } else if (invoice.status === 'DRAFT') {
      await prisma.invoice.update({ where: { id: parseInt(invoice_id) }, data: { status: 'SENT' } });
    }

    req.app.get('io')?.emit('payment:received', payment);
    req.app.get('automation')?.onPaymentReceived(payment, req.user.id);
    const clientName = payment.invoice?.client?.name || 'unknown client';
    await log({ user_id: req.user.id, action: 'CREATE', module: 'finance', entity_id: payment.id, entity_type: 'Payment', description: `Recorded payment of $${amount_paid} from ${clientName}` });
    await notify(req.app.get('io'), { user_id: req.user.id, type: 'PAYMENT', title: 'Payment Received', message: `$${amount_paid} payment recorded for ${clientName}` });
    res.status(201).json(payment);
  } catch (err) { next(err); }
};

const getPayments = async (req, res, next) => {
  try {
    const { invoice_id, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = invoice_id ? { invoice_id: parseInt(invoice_id) } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: parseInt(limit),
        include: {
          invoice: {
            include: { client: { select: { id: true, name: true, company: true } } },
          },
        },
        orderBy: { payment_date: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ payments, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const getPayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { invoice: { include: { client: true, project: true } } },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) { next(err); }
};

module.exports = { createPayment, getPayments, getPayment };
