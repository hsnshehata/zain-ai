const express = require('express');
const router = express.Router();
const { handleMessage } = require('../controllers/facebookController');
const { getSettings, updateSettings } = require('../controllers/botController');
const authMiddleware = require('../middleware/auth'); // افتراض وجود middleware للتوثيق

router.post('/', handleMessage);

// Routes لإعدادات التصاريح
router.get('/settings', authMiddleware, getSettings);
router.patch('/settings', authMiddleware, updateSettings);

module.exports = router;
