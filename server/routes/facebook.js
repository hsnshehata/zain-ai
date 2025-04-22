const express = require('express');
const router = express.Router();
const { handleMessage } = require('../controllers/facebookController');
const { getSettings, updateSettings } = require('../controllers/botController');
const authMiddleware = require('../middleware/authenticate'); // التعديل هنا

router.post('/', handleMessage);

// Routes لإعدادات التصاريح
router.get('/settings', authMiddleware, getSettings);
router.patch('/settings', authMiddleware, updateSettings);

module.exports = router;
