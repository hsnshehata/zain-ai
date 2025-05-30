// server/routes/bots.js
const express = require('express');
const router = express.Router();
const botsController = require('../controllers/botsController');
const botController = require('../controllers/botController');
const authenticate = require('../middleware/authenticate');
const Bot = require('../models/Bot');
const axios = require('axios');
const multer = require('multer');

// إعداد multer لرفع الصور
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم، يرجى رفع صورة PNG أو JPG'), false);
    }
  }
});

// Log عشان نتأكد إن الـ router شغال
console.log('✅ Initializing bots routes');

// دالة لتحويل توكن قصير المدى لتوكن طويل المدى
const convertToLongLivedToken = async (shortLivedToken) => {
  const appId = '499020366015281';
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const url = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

  try {
    const response = await axios.get(url);
    if (response.data.access_token) {
      console.log(`[${new Date().toISOString()}] ✅ Successfully converted short-lived token to long-lived token: ${response.data.access_token.slice(0, 10)}...`);
      return response.data.access_token;
    }
    throw new Error('Failed to convert token: No access_token in response');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Error converting to long-lived token:`, err.response?.data || err.message);
    throw err;
  }
};

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

// Routes for auto message settings
router.get('/:id/auto-message', authenticate, botsController.getAutoMessageSettings);
router.post(
  '/:id/auto-message',
  authenticate,
  upload.fields([
    { name: 'facebookAutoMessageImage', maxCount: 1 },
    { name: 'instagramAutoMessageImage', maxCount: 1 }
  ]),
  botsController.saveAutoMessageSettings
);

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
  const { facebookApiKey, facebookPageId, instagramApiKey, instagramPageId, whatsappApiKey, whatsappBusinessAccountId, convertToLongLived } = req.body;

  try {
    // Log the user role and userId for debugging
    console.log(`[POST /api/bots/${botId}/link-social] User Role: ${req.user.role} | User ID: ${req.user.userId}`);

    // البحث عن البوت بناءً على الـ ID
    let bot;
    if (req.user.role === 'superadmin') {
      bot = await Bot.findById(botId);
    } else {
      bot = await Bot.findOne({ _id: botId, userId: req.user.userId });
    }

    if (!bot) {
      console.log(`[POST /api/bots/${botId}/link-social] البوت غير موجود أو لا يخص المستخدم | Bot User ID: ${bot ? bot.userId : 'Not Found'}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود أو لا يخصك' });
    }

    // Log the bot's userId for debugging
    console.log(`[POST /api/bots/${botId}/link-social] Bot User ID: ${bot.userId}`);

    // التحقق من البيانات بناءً على نوع الربط
    let updateData = {};

    // لو فيسبوك
    if (facebookApiKey && facebookPageId) {
      let finalFacebookApiKey = facebookApiKey;
      if (convertToLongLived) {
        try {
          finalFacebookApiKey = await convertToLongLivedToken(facebookApiKey);
        } catch (err) {
          return res.status(500).json({ success: false, message: 'فشل في تحويل التوكن إلى طويل المدى: ' + err.message });
        }
      }
      updateData.facebookApiKey = finalFacebookApiKey;
      updateData.facebookPageId = facebookPageId;
      updateData.lastFacebookTokenRefresh = new Date();
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

    // لوج قبل التحديث
    console.log(`[POST /api/bots/${botId}/link-social] Updating bot with data:`, updateData);

    // تحديث البوت
    const updatedBot = await Bot.findByIdAndUpdate(
      botId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedBot) {
      console.error(`[POST /api/bots/${botId}/link-social] Failed to update bot: Bot not found`);
      return res.status(500).json({ success: false, message: 'فشل في تحديث البوت' });
    }

    // لوج بعد التحديث
    console.log(`[POST /api/bots/${botId}/link-social] Bot updated successfully:`, {
      facebookApiKey: updatedBot.facebookApiKey?.slice(0, 10) + '...',
      facebookPageId: updatedBot.facebookPageId,
      lastFacebookTokenRefresh: updatedBot.lastFacebookTokenRefresh
    });

    res.status(200).json({ success: true, message: 'تم ربط الحساب بنجاح', data: updatedBot });
  } catch (error) {
    console.error(`[POST /api/bots/${botId}/link-social] Error linking social account:`, error.message, error.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + error.message });
  }
});

// إلغاء ربط صفحة فيسبوك
router.post('/:id/unlink-facebook', authenticate, botsController.unlinkFacebookPage);

// إلغاء ربط حساب إنستجرام
router.post('/:id/unlink-instagram', authenticate, botsController.unlinkInstagramAccount);

// تبادل Instagram OAuth code بـ access token
router.post('/:id/exchange-instagram-code', authenticate, (req, res) => {
  console.log(`[${new Date().toISOString()}] 📌 Received request for /api/bots/${req.params.id}/exchange-instagram-code`);
  botsController.exchangeInstagramCode(req, res);
});

// حذف بوت
router.delete('/:id', authenticate, botsController.deleteBot);

module.exports = router;
