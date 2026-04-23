const express = require('express');
const router = express.Router();
const { getTeam, getMember, updateMember } = require('../controllers/team');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getTeam);
router.get('/:id', getMember);
router.put('/:id', authorize('SUPER_ADMIN', 'PROJECT_MANAGER'), updateMember);

module.exports = router;
