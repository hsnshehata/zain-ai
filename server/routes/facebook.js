const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/botController');
const authMiddleware = require('../middleware/authenticate');

router.get('/settings', authMiddleware, getSettings);
router.patch('/settings', authMiddleware, updateSettings);

module.exports = router;
