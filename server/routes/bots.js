// /server/routes/bots.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Bot = require('../models/Bot');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const authenticate = require('../middleware/authenticate');
const botsController = require('../controllers/botsController');

// Middleware للتحقق من صلاحية الوصول للبوت
const checkBotAccess = async (req, res, next) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    const isOwner = bot.userId.toString() === req.user._id.toString();
    const isSuperadmin = req.user.role === 'superadmin';

    if (!isOwner && !isSuperadmin) {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى هذا البوت' });
    }

    next();
  } catch (err) {
    console.error('❌ خطأ في التحقق من صلاحية الوصول للبوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب كل البوتات
router.get('/', authenticate, botsController.getBots);

// جلب التقييمات بناءً على botId مع اسم المستخدم من فيسبوك (التقييمات المرئية فقط)
router.get('/:id/feedback', authenticate, checkBotAccess, botsController.getFeedback);

// جلب أكثر الردود السلبية
router.get('/feedback/negative-replies/:botId', authenticate, botsController.getTopNegativeReplies);

// إخفاء تقييم معين (بدل الحذف)
router.delete('/:id/feedback/:feedbackId', authenticate, checkBotAccess, botsController.hideFeedback);

// إخفاء جميع التقييمات (إيجابية أو سلبية) دفعة واحدة
router.delete('/:id/feedback/clear/:type', authenticate, checkBotAccess, botsController.clearFeedbackByType);

// إنشاء بوت جديد
router.post('/', authenticate, botsController.createBot);

// تعديل بوت
router.put('/:id', authenticate, checkBotAccess, botsController.updateBot);

// حذف بوت
router.delete('/:id', authenticate, botsController.deleteBot);

module.exports = router;
