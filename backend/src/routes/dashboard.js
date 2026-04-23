const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/dashboard');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/summary', getSummary);

module.exports = router;
