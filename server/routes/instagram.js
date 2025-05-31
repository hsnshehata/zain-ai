const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/botController');
const authMiddleware = require('../middleware/authenticate');

// Routes for Instagram settings with botId in the URL
router.get('/:id/instagram-settings', authMiddleware, getSettings);
router.patch('/:id/instagram-settings', authMiddleware, updateSettings);

module.exports = router;
