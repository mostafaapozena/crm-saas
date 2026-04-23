const prisma = require('../lib/prisma');

// ─── VENDORS ──────────────────────────────────────────────────────────────────

const createVendor = async (req, res, next) => {
  try {
    const { name, contact_name, email, phone, address, category, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const vendor = await prisma.vendor.create({
      data: { name, contact_name, email, phone, address, category, notes, created_by: req.user.id },
    });
    res.status(201).json(vendor);
  } catch (err) { next(err); }
};

const getVendors = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = { contains: category };
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }];

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: { select: { rfqs: true, expenses: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(vendors);
  } catch (err) { next(err); }
};

const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact_name, email, phone, address, category, rating, status, notes } = req.body;

    const vendor = await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }), ...(contact_name !== undefined && { contact_name }),
        ...(email !== undefined && { email }), ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }), ...(category !== undefined && { category }),
        ...(rating !== undefined && { rating: parseInt(rating) }),
        ...(status && ['ACTIVE', 'INACTIVE', 'BLACKLISTED'].includes(status) && { status }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(vendor);
  } catch (err) { next(err); }
};

const deleteVendor = async (req, res, next) => {
  try {
    await prisma.vendor.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Vendor deleted' });
  } catch (err) { next(err); }
};

// ─── RFQ ──────────────────────────────────────────────────────────────────────

const createRFQ = async (req, res, next) => {
  try {
    const { title, description, vendor_id, project_id, deadline } = req.body;
    if (!title || !vendor_id) return res.status(400).json({ error: 'title and vendor_id required' });

    const rfq = await prisma.rFQ.create({
      data: {
        title, description,
        vendor_id: parseInt(vendor_id),
        project_id: project_id ? parseInt(project_id) : null,
        created_by: req.user.id,
        deadline: deadline ? new Date(deadline) : null,
      },
      include: { vendor: { select: { id: true, name: true } }, quotations: true },
    });
    res.status(201).json(rfq);
  } catch (err) { next(err); }
};

const getRFQs = async (req, res, next) => {
  try {
    const { vendor_id, status } = req.query;
    const where = {};
    if (vendor_id) where.vendor_id = parseInt(vendor_id);
    if (status) where.status = status;

    const rfqs = await prisma.rFQ.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        quotations: { include: { purchaseOrder: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rfqs);
  } catch (err) { next(err); }
};

const updateRFQ = async (req, res, next) => {
  try {
    const rfq = await prisma.rFQ.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(req.body.title && { title: req.body.title }),
        ...(req.body.status && ['DRAFT', 'SENT', 'RECEIVED', 'CLOSED'].includes(req.body.status) && { status: req.body.status }),
        ...(req.body.deadline !== undefined && { deadline: req.body.deadline ? new Date(req.body.deadline) : null }),
      },
      include: { vendor: { select: { id: true, name: true } }, quotations: true },
    });
    res.json(rfq);
  } catch (err) { next(err); }
};

// ─── QUOTATIONS ───────────────────────────────────────────────────────────────

const createQuotation = async (req, res, next) => {
  try {
    const { rfq_id, amount, validity_days, notes } = req.body;
    if (!rfq_id || !amount) return res.status(400).json({ error: 'rfq_id and amount required' });

    const quotation = await prisma.quotation.create({
      data: {
        rfq_id: parseInt(rfq_id),
        amount: parseFloat(amount),
        validity_days: validity_days ? parseInt(validity_days) : 30,
        notes,
      },
      include: { rfq: { include: { vendor: true } } },
    });

    // Mark RFQ as RECEIVED
    await prisma.rFQ.update({ where: { id: parseInt(rfq_id) }, data: { status: 'RECEIVED' } });
    res.status(201).json(quotation);
  } catch (err) { next(err); }
};

const approveQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({ where: { id: parseInt(id) }, include: { rfq: true } });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    // Approve this, reject others for same RFQ
    await prisma.quotation.updateMany({
      where: { rfq_id: quotation.rfq_id, id: { not: parseInt(id) } },
      data: { status: 'REJECTED' },
    });
    const updated = await prisma.quotation.update({ where: { id: parseInt(id) }, data: { status: 'APPROVED' } });

    // Auto-generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        quotation_id: parseInt(id),
        po_number: poNumber,
        amount: quotation.amount,
        created_by: req.user.id,
      },
    });

    res.json({ quotation: updated, purchaseOrder: po });
  } catch (err) { next(err); }
};

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────────────

const getPurchaseOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        quotation: { include: { rfq: { include: { vendor: { select: { id: true, name: true } } } } } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) { next(err); }
};

const updatePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, delivery_date, notes } = req.body;

    const po = await prisma.purchaseOrder.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && ['PENDING', 'APPROVED', 'DELIVERED', 'CANCELLED'].includes(status) && { status }),
        ...(delivery_date !== undefined && { delivery_date: delivery_date ? new Date(delivery_date) : null }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(po);
  } catch (err) { next(err); }
};

module.exports = {
  createVendor, getVendors, updateVendor, deleteVendor,
  createRFQ, getRFQs, updateRFQ,
  createQuotation, approveQuotation,
  getPurchaseOrders, updatePurchaseOrder,
};
