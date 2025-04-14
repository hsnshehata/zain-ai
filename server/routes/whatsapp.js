const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const whatsappController = require('../controllers/whatsappController');

router.get('/session', authenticate, whatsappController.getSession);
router.post('/connect', authenticate, whatsappController.connect);
router.post('/connect-qr', authenticate, whatsappController.connectWithQR);
router.post('/disconnect', authenticate, whatsappController.disconnect);

module.exports = router;
