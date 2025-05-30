const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/botController');
const authMiddleware = require('../middleware/authenticate');

// Routes for settings with botId in the URL
router.get('/:id/settings', authMiddleware, getSettings);
router.patch('/:id/settings', authMiddleware, updateSettings);

module.exports = router;
