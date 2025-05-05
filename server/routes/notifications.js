const express = require('express');
const router = express.Router();
const { sendGlobalNotification, getNotifications, markAsRead } = require('../controllers/notificationsController');
const authenticate = require('../middleware/authenticate');

router.post('/global', authenticate, sendGlobalNotification);
router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);

module.exports = router;
