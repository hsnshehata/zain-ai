// server/routes/bots.js
const express = require('express');
const router = express.Router();
const botsController = require('../controllers/botsController');
const botController = require('../controllers/botController');
const authenticate = require('../middleware/authenticate');
const Bot = require('../models/Bot');
const axios = require('axios');
const { validateBody, Joi } = require('../middleware/validate');
const logger = require('../logger');

// Log عشان نتأكد إن الـ router شغال
logger.info('✅ Initializing bots routes');

// مخططات التحقق
const createBotSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  userId: Joi.string().length(24).required(),
  facebookApiKey: Joi.string().allow('', null),
  facebookPageId: Joi.string().allow('', null),
  instagramApiKey: Joi.string().allow('', null),
  instagramPageId: Joi.string().allow('', null),
  subscriptionType: Joi.string().valid('free', 'monthly', 'yearly').default('free'),
  welcomeMessage: Joi.string().max(500).allow('', null)
});

const updateBotSchema = Joi.object({
  name: Joi.string().min(2).max(80).optional(),
  userId: Joi.string().length(24).optional(),
  facebookApiKey: Joi.string().allow('', null),
  facebookPageId: Joi.string().allow('', null),
  instagramApiKey: Joi.string().allow('', null),
  instagramPageId: Joi.string().allow('', null),
  subscriptionType: Joi.string().valid('free', 'monthly', 'yearly').optional(),
  welcomeMessage: Joi.string().max(500).allow('', null),
  isActive: Joi.boolean().optional(),
  autoStopDate: Joi.date().optional()
});

const linkSocialSchema = Joi.object({
  facebookApiKey: Joi.string().allow('', null),
  facebookPageId: Joi.string().allow('', null),
  instagramApiKey: Joi.string().allow('', null),
  instagramPageId: Joi.string().allow('', null),
  whatsappApiKey: Joi.string().allow('', null),
  whatsappBusinessAccountId: Joi.string().allow('', null),
  convertToLongLived: Joi.boolean().optional()
}).custom((value, helpers) => {
  const hasFacebook = value.facebookApiKey || value.facebookPageId;
  const hasInstagram = value.instagramApiKey || value.instagramPageId;
  const hasWhatsapp = value.whatsappApiKey || value.whatsappBusinessAccountId;
  if (!hasFacebook && !hasInstagram && !hasWhatsapp) {
    return helpers.error('any.custom', { message: 'يجب إرسال بيانات ربط واحدة على الأقل' });
  }
  if (value.facebookApiKey && !value.facebookPageId) {
    return helpers.error('any.custom', { message: 'معرف صفحة الفيسبوك مطلوب عند إدخال مفتاح الفيسبوك' });
  }
  if (value.instagramApiKey && !value.instagramPageId) {
    return helpers.error('any.custom', { message: 'معرف صفحة الإنستجرام مطلوب عند إدخال مفتاح الإنستجرام' });
  }
  if (value.whatsappApiKey && !value.whatsappBusinessAccountId) {
    return helpers.error('any.custom', { message: 'whatsappBusinessAccountId مطلوب عند إدخال مفتاح واتساب' });
  }
  return value;
}, 'Link social validation');

// دالة لتحويل توكن قصير المدى لتوكن طويل المدى
const convertToLongLivedToken = async (shortLivedToken) => {
  const appId = '499020366015281';
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const url = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

  try {
    const response = await axios.get(url);
    if (response.data.access_token) {
      logger.info('✅ Successfully converted short-lived token to long-lived token', { tokenPreview: `${response.data.access_token.slice(0, 10)}...` });
      return response.data.access_token;
    }
    throw new Error('Failed to convert token: No access_token in response');
  } catch (err) {
    logger.error('❌ Error converting to long-lived token', { error: err.response?.data || err.message });
    throw err;
  }
};

// جلب كل البوتات
router.get('/', authenticate, botsController.getBots);

// جلب بوت معين بناءً على الـ ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    logger.info('جاري جلب البوت', { path: `/api/bots/${req.params.id}`, botId: req.params.id, userId: req.user.userId });
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      logger.warn('البوت غير موجود', { botId: req.params.id });
      return res.status(404).json({ message: 'البوت غير موجود' });
    }
    logger.info('تم جلب البوت بنجاح', { botId: req.params.id });
    res.status(200).json(bot);
  } catch (err) {
    logger.error('❌ خطأ في جلب البوت', { botId: req.params.id, err });
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
router.post('/', authenticate, validateBody(createBotSchema), botsController.createBot);

// تعديل بوت
router.put('/:id', authenticate, validateBody(updateBotSchema), botsController.updateBot);

// ربط صفحة فيسبوك أو إنستجرام أو واتساب بالبوت
router.post('/:id/link-social', authenticate, validateBody(linkSocialSchema), async (req, res) => {
  const { id: botId } = req.params;
  const { facebookApiKey, facebookPageId, instagramApiKey, instagramPageId, whatsappApiKey, whatsappBusinessAccountId, convertToLongLived } = req.body;

  try {
    // Log the user role and userId for debugging
    logger.info('Request to link social', { path: `/api/bots/${botId}/link-social`, role: req.user.role, userId: req.user.userId });

    // البحث عن البوت بناءً على الـ ID
    let bot;
    if (req.user.role === 'superadmin') {
      bot = await Bot.findById(botId);
    } else {
      bot = await Bot.findOne({ _id: botId, userId: req.user.userId });
    }

    if (!bot) {
      logger.warn('البوت غير موجود أو لا يخص المستخدم', { botId, botUserId: bot ? bot.userId : 'Not Found', requestUserId: req.user.userId });
      return res.status(404).json({ success: false, message: 'البوت غير موجود أو لا يخصك' });
    }

    // Log the bot's userId for debugging
    logger.info('Bot owner fetched', { botId, botUserId: bot.userId });

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
    logger.info('Updating bot social links', { botId, updateData });

    // تحديث البوت
    const updatedBot = await Bot.findByIdAndUpdate(
      botId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedBot) {
      logger.error('Failed to update bot during link-social', { botId });
      return res.status(500).json({ success: false, message: 'فشل في تحديث البوت' });
    }

    // لوج بعد التحديث
    logger.info('Bot updated successfully after link-social', {
      botId,
      facebookApiKey: updatedBot.facebookApiKey?.slice(0, 10) + '...',
      facebookPageId: updatedBot.facebookPageId,
      lastFacebookTokenRefresh: updatedBot.lastFacebookTokenRefresh
    });

    res.status(200).json({ success: true, message: 'تم ربط الحساب بنجاح', data: updatedBot });
  } catch (error) {
    logger.error('Error linking social account', { botId, err: error });
    res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + error.message });
  }
});

// إلغاء ربط صفحة فيسبوك
router.post('/:id/unlink-facebook', authenticate, botsController.unlinkFacebookPage);

// إلغاء ربط حساب إنستجرام
router.post('/:id/unlink-instagram', authenticate, botsController.unlinkInstagramAccount);

// تبادل Instagram OAuth code بـ access token
router.post('/:id/exchange-instagram-code', authenticate, (req, res) => {
  logger.info('Received request for exchange-instagram-code', { botId: req.params.id });
  botsController.exchangeInstagramCode(req, res);
});

// حذف بوت
router.delete('/:id', authenticate, botsController.deleteBot);

module.exports = router;
