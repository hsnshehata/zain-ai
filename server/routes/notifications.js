const express = require('express');
const router = express.Router();
const { sendGlobalNotification, getNotifications, markAsRead } = require('../controllers/notificationsController');
const authenticate = require('../middleware/authenticate');

// روت لإرسال إشعار عام لكل المستخدمين (للسوبر أدمن بس)
router.post('/global', authenticate, sendGlobalNotification);

// روت لجلب إشعارات المستخدم الحالي
router.get('/', authenticate, getNotifications);

// روت لتعليم إشعار كمقروء
router.put('/:id/read', authenticate, markAsRead);

module.exports = router;
