const express = require('express');
const authenticate = require('../middleware/authenticate');
const telegramController = require('../controllers/telegramController');

const router = express.Router();

router.post('/webhook', telegramController.handleWebhook);
router.get('/status', authenticate, telegramController.getStatus); // يتطلب botId كـ query
router.post('/link-code', authenticate, telegramController.generateLinkCode); // botId في body
router.post('/preferences', authenticate, telegramController.updatePreferences); // botId في body
router.post('/unlink', authenticate, telegramController.unlink); // botId في body

module.exports = router;
