const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const whatsappController = require('../controllers/whatsappController');

// جلب حالة الجلسة
router.get('/session', authenticate, whatsappController.getSession);

// بدء الاتصال باستخدام الرقم
router.post('/connect', authenticate, whatsappController.connect);

// بدء الاتصال باستخدام كود QR
router.post('/connect-qr', authenticate, whatsappController.connectWithQR);

// إنهاء الجلسة
router.post('/disconnect', authenticate, whatsappController.disconnect);

module.exports = router;
