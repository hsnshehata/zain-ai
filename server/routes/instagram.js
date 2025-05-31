// server/routes/instagram.js
const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/botController');
const authMiddleware = require('../middleware/authenticate');

// Routes for Instagram settings with botId in the URL
router.get('/:id/instagram-settings', authMiddleware, (req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📩 GET request received for Instagram settings, botId: ${req.params.id}`);
  getSettings(req, res, next);
});

router.patch('/:id/instagram-settings', authMiddleware, (req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📩 PATCH request received for Instagram settings, botId: ${req.params.id}, body:`, JSON.stringify(req.body, null, 2));
  updateSettings(req, res, next);
});

module.exports = router;
