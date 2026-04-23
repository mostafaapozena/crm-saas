const express = require('express');
const router = express.Router();
const { getNotifications, markRead, getActivityLog } = require('../controllers/notifications');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);
router.get('/', getNotifications);
router.put('/:id/read', markRead);
router.get('/activity', getActivityLog);
module.exports = router;
