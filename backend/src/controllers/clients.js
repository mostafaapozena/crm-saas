const prisma = require('../lib/prisma');
const { log } = require('../lib/activityLogger');

const createClient = async (req, res, next) => {
  try {
    const { name, company, phone, whatsapp_phone, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Client name is required' });

    const client = await prisma.client.create({
      data: { name, company, phone, whatsapp_phone, email },
      include: { deals: true },
    });

    req.app.get('io')?.emit('client:created', client);
    await log({ user_id: req.user.id, action: 'CREATE', module: 'clients', entity_id: client.id, entity_type: 'Client', description: `Created client: ${client.name}` });
    res.status(201).json(client);
  } catch (err) { next(err); }
};

const getClients = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }, { company: { contains: search } }] }
      : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where, skip, take: parseInt(limit),
        include: { deals: { select: { id: true, value: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({ clients, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const getClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: { deals: { include: { lead: { select: { id: true, name: true, stage: true } } } } },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { next(err); }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, company, phone, whatsapp_phone, email } = req.body;

    const existing = await prisma.client.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }), ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }), ...(whatsapp_phone !== undefined && { whatsapp_phone }),
        ...(email !== undefined && { email }),
      },
    });

    await log({ user_id: req.user.id, action: 'UPDATE', module: 'clients', entity_id: client.id, entity_type: 'Client', description: `Updated client: ${client.name}` });
    res.json(client);
  } catch (err) { next(err); }
};

module.exports = { createClient, getClients, getClient, updateClient };
