const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProject, updateProject, deleteProject } = require('../controllers/projects');
const { authenticate } = require('../middleware/auth');
const { authorizeRbac } = require('../middleware/rbac');
const { MODULES } = require('../config/rbac');

router.use(authenticate);

router.get('/',     authorizeRbac(MODULES.PROJECTS, 'read'),   getProjects);
router.post('/',    authorizeRbac(MODULES.PROJECTS, 'create'), createProject);
router.get('/:id',  authorizeRbac(MODULES.PROJECTS, 'read'),   getProject);
router.put('/:id',  authorizeRbac(MODULES.PROJECTS, 'update'), updateProject);
router.delete('/:id', authorizeRbac(MODULES.PROJECTS, 'delete'), deleteProject);

module.exports = router;
