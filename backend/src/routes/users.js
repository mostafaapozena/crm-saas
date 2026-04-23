const express = require('express');
const router = express.Router();
const { getRoles, getUsers, createUser, updateUser, deleteUser } = require('../controllers/users');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Role catalogue — accessible to SUPER_ADMIN (used to populate UI dropdowns)
router.get('/roles', authorize('SUPER_ADMIN'), getRoles);

// User management — SUPER_ADMIN only
router.use(authorize('SUPER_ADMIN'));
router.get('/',       getUsers);
router.post('/',      createUser);
router.put('/:id',    updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
