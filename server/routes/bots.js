const express = require('express');
const router = express.Router();
const botsController = require('../controllers/botsController');
const botController = require('../controllers/botController');
const authenticate = require('../middleware/authenticate');
const Bot = require('../models/Bot');

// جلب كل البوتات
router.get('/', authenticate, botsController.getBots);

// جلب بوت معين بناءً على الـ ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    console.log(`[GET /api/bots/${req.params.id}] جاري جلب البوت | Bot ID: ${req.params.id} | User ID: ${req.user.userId}`);
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      console.log(`[GET /api/bots/${req.params.id}] البوت غير موجود`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }
    console.log(`[GET /api/bots/${req.params.id}] تم جلب البوت بنجاح:`, bot);
    res.status(200).json(bot);
  } catch (err) {
    console.error(`[GET /api/bots/${req.params.id}] ❌ خطأ في جلب البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Routes for settings with botId in the URL
router.get('/:id/settings', authenticate, botController.getSettings);
router.patch('/:id/settings', authenticate, botController.updateSettings);
router.get('/:id/instagram-settings', authenticate, botController.getSettings);
router.patch('/:id/instagram-settings', authenticate, botController.updateSettings);

// جلب التقييمات لبوت معين
router.get('/:id/feedback', authenticate, botsController.getFeedback);

// جلب أكثر الردود السلبية
router.get('/:id/negative-replies', authenticate, botsController.getTopNegativeReplies);

// إخفاء تقييم معين
router.delete('/:id/feedback/:feedbackId', authenticate, botsController.hideFeedback);

// إخفاء جميع التقييمات (إيجابية أو سلبية)
router.delete('/:id/feedback/:type/clear', authenticate, botsController.clearFeedbackByType);

// إنشاء بوت جديد
router.post('/', authenticate, botsController.createBot);

// تعديل بوت
router.put('/:id', authenticate, botsController.updateBot);

// ربط صفحة فيسبوك أو إنستجرام بالبوت
router.post('/:id/link-social', authenticate, botsController.linkSocialPage);

// حذف بوت
router.delete('/:id', authenticate, botsController.deleteBot);

module.exports = router;
