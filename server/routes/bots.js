// server/routes/bots.js (الملف الكامل)
const express = require('express');
const router = express.Router();
const botsController = require('../controllers/botsController');
const botController = require('../controllers/botController');
const authenticate = require('../middleware/authenticate');
const Bot = require('../models/Bot');

// Log عشان نتأكد إن الـ router شغال
console.log('✅ Initializing bots routes');

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
router.get('/:id/instagram-settings', authenticate, botController.getInstagramSettings);
router.patch('/:id/instagram-settings', authenticate, botController.updateInstagramSettings);

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

// ربط صفحة فيسبوك أو إنستجرام أو واتساب بالبوت
router.post('/:id/link-social', authenticate, async (req, res) => {
  const { id: botId } = req.params;
  const { facebookApiKey, facebookPageId, instagramApiKey, instagramPageId, whatsappApiKey, whatsappBusinessAccountId } = req.body;

  try {
    const bot = await Bot.findOne({ _id: botId, userId: req.user.userId });
    if (!bot) {
      return res.status(404).json({ success: false, message: 'البوت غير موجود أو لا يخصك' });
    }

    // التحقق من البيانات بناءً على نوع الربط
    let updateData = {};

    // لو فيسبوك
    if (facebookApiKey && facebookPageId) {
      updateData.facebookApiKey = facebookApiKey;
      updateData.facebookPageId = facebookPageId;
    }

    // لو إنستجرام
    if (instagramApiKey && instagramPageId) {
      updateData.instagramApiKey = instagramApiKey;
      updateData.instagramPageId = instagramPageId;
      updateData.lastInstagramTokenRefresh = new Date();
    }

    // لو واتساب
    if (whatsappApiKey && whatsappBusinessAccountId) {
      updateData.whatsappApiKey = whatsappApiKey;
      updateData.whatsappBusinessAccountId = whatsappBusinessAccountId;
      updateData.lastWhatsappTokenRefresh = new Date();
    }

    // التحقق إن فيه بيانات للتحديث
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات لربط الحساب' });
    }

    // تحديث البوت
    const updatedBot = await Bot.findByIdAndUpdate(botId, { $set: updateData }, { new: true });
    res.status(200).json({ success: true, message: 'تم ربط الحساب بنجاح', data: updatedBot });
  } catch (error) {
    console.error('خطأ في ربط الحساب:', error);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + error.message });
  }
});

// إلغاء ربط صفحة فيسبوك
router.post('/:id/unlink-facebook', authenticate, botsController.unlinkFacebookPage);

// إلغاء ربط حساب إنستجرام
router.post('/:id/unlink-instagram', authenticate, botsController.unlinkInstagramAccount);

// تبادل Instagram OAuth code بـ access token
router.post('/:id/exchange-instagram-code', authenticate, (req, res) => {
  console.log(`📌 Received request for /api/bots/${req.params.id}/exchange-instagram-code`);
  botsController.exchangeInstagramCode(req, res);
});

// حذف بوت
router.delete('/:id', authenticate, botsController.deleteBot);

module.exports = router;
