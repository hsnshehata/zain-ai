const express = require('express');
const router = express.Router();
const { sendGlobalNotification, getNotifications, markAsRead } = require('../controllers/notificationsController');
const auth = require('../middleware/auth');

router.post('/global', auth, sendGlobalNotification);
router.get('/', auth, getNotifications);
router.put('/:id/read', auth, markAsRead);

module.exports = router;
