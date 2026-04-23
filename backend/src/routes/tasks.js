const express = require('express');
const router = express.Router();
const { createTask, getTasks, getTask, updateTask, deleteTask } = require('../controllers/tasks');
const { authenticate } = require('../middleware/auth');
const { authorizeRbac } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

router.use(authenticate);

router.get('/',     authorizeRbac(MODULES.TASKS, 'read'),   getTasks);
router.post('/',    authorizeRbac(MODULES.TASKS, 'create'), createTask);
router.get('/:id',  authorizeRbac(MODULES.TASKS, 'read'),   getTask);
router.put('/:id',  authorizeRbac(MODULES.TASKS, 'update'), updateTask);
router.delete('/:id', authorizeRbac(MODULES.TASKS, 'delete'), deleteTask);

module.exports = router;
