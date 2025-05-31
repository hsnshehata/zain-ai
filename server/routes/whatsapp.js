// server/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const whatsappController = require('../controllers/whatsappController');
const { getSettings, updateSettings } = require('../controllers/botController');

// Routes for WhatsApp session management
router.get('/session', authenticate, whatsappController.getSession);
router.post('/connect', authenticate, whatsappController.connect);
router.post('/connect-qr', authenticate, whatsappController.connectWithQR);
router.post('/disconnect', authenticate, whatsappController.disconnect);

// Routes for WhatsApp settings with botId in the URL
router.get('/:id/whatsapp-settings', authenticate, getSettings);
router.patch('/:id/whatsapp-settings', authenticate, updateSettings);

module.exports = router;
