// /server/routes/bots.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Bot = require('../models/Bot');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const authenticate = require('../middleware/authenticate');
const botsController = require('../controllers/botsController');

// جلب كل البوتات
router.get('/', authenticate, botsController.getBots);

// جلب حالة البوتات (نشط مقابل غير نشط)
router.get('/status', authenticate, botsController.getBotsStatus);

// جلب توزيع البوتات حسب المستخدمين
router.get('/per-user', authenticate, botsController.getBotsPerUser);

// جلب التقييمات بناءً على botId مع اسم المستخدم من فيسبوك (التقييمات المرئية فقط)
router.get('/:id/feedback', authenticate, botsController.getFeedback);

// جلب أكثر الردود السلبية
router.get('/feedback/negative-replies/:botId', authenticate, botsController.getTopNegativeReplies);

// إخفاء تقييم معين (بدل الحذف)
router.delete('/:id/feedback/:feedbackId', authenticate, botsController.hideFeedback);

// إخفاء جميع التقييمات (إيجابية أو سلبية) دفعة واحدة
router.delete('/:id/feedback/clear/:type', authenticate, botsController.clearFeedbackByType);

// إنشاء بوت جديد
router.post('/', authenticate, botsController.createBot);

// تعديل بوت
router.put('/:id', authenticate, botsController.updateBot);

// حذف بوت
router.delete('/:id', authenticate, botsController.deleteBot);

module.exports = router;
