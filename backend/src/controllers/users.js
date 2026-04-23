const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

// ── GET /users/roles ──────────────────────────────────────────────────────────
// Returns the full role catalogue from DB — NO hardcoding.
const getRoles = async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, key: true, label: true },
      orderBy: { id: 'asc' },
    });
    res.json(roles);
  } catch (err) { next(err); }
};

// ── GET /users ────────────────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich each user with the role label from the catalogue
    const roleCatalogue = await prisma.role.findMany({ select: { key: true, label: true } });
    const labelMap = Object.fromEntries(roleCatalogue.map(r => [r.key, r.label]));

    res.json(users.map(u => ({ ...u, roleLabel: labelMap[u.role] || u.role })));
  } catch (err) { next(err); }
};

// ── POST /users ───────────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    // Validate role against DB catalogue (no hardcoded list)
    const validRole = await prisma.role.findUnique({ where: { key: role } });
    if (!validRole) {
      return res.status(400).json({ error: `Invalid role: "${role}". Fetch valid roles from GET /users/roles` });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role: validRole.key,
        ...(department && { department }),
      },
      select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
    });

    res.status(201).json({ ...user, roleLabel: validRole.label });
  } catch (err) { next(err); }
};

// ── PUT /users/:id ────────────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, password, department, status } = req.body;

    const data = {};
    if (name) data.name = name;
    if (department !== undefined) data.department = department;
    if (status) data.status = status;

    if (role) {
      const validRole = await prisma.role.findUnique({ where: { key: role } });
      if (!validRole) {
        return res.status(400).json({ error: `Invalid role: "${role}". Fetch valid roles from GET /users/roles` });
      }
      data.role = validRole.key;
    }

    if (password) data.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, name: true, email: true, role: true, department: true, status: true, createdAt: true },
    });

    // Attach label for convenience
    const roleRow = user.role ? await prisma.role.findUnique({ where: { key: user.role } }) : null;
    res.json({ ...user, roleLabel: roleRow?.label || user.role });
  } catch (err) { next(err); }
};

// ── DELETE /users/:id ─────────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

module.exports = { getRoles, getUsers, createUser, updateUser, deleteUser };
