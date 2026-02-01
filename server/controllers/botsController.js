const express = require('express');
const Bot = require('../models/Bot');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const axios = require('axios');
const logger = require('../logger');

// جلب كل البوتات
exports.getBots = async (req, res) => {
  try {
    const bots = await Bot.find().populate('userId');
    const currentDate = new Date();

    // التحقق من autoStopDate لكل بوت وتحديث الحالة إذا لزم الأمر
    for (const bot of bots) {
      if (bot.autoStopDate && new Date(bot.autoStopDate) <= currentDate && bot.isActive) {
        bot.isActive = false;
        await bot.save();

        // إنشاء إشعار للمستخدم
        const notification = new Notification({
          user: bot.userId,
          title: `توقف البوت ${bot.name}`,
          message: `البوت ${bot.name} توقف تلقائيًا بسبب انتهاء الاشتراك في ${new Date(bot.autoStopDate).toLocaleDateString('ar-EG')}`,
          isRead: false
        });
        await notification.save();

        logger.info('bot_auto_stopped', { botId: bot._id, botName: bot.name, userId: bot.userId, autoStopDate: bot.autoStopDate });
      }
    }

    res.status(200).json(bots);
  } catch (err) {
    logger.error('bots_fetch_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب التقييمات بناءً على botId مع اسم المستخدم من فيسبوك/إنستجرام
exports.getFeedback = async (req, res) => {
  try {
    const botId = req.params.id;
    const { startDate, endDate } = req.query;

    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    let query = { botId, isVisible: true };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const feedback = await Feedback.find(query).sort({ timestamp: -1 });

    // تجنب تكرار طلبات الاسم لنفس المستخدم والحد من الضجيج في اللوجز
    const usernameCache = new Map();

    const feedbackWithUsernames = await Promise.all(
      feedback.map(async (item) => {
        let username = item.userId;
        if (usernameCache.has(item.userId)) {
          return {
            ...item._doc,
            username: usernameCache.get(item.userId),
            feedback: item.type === 'like' ? 'positive' : 'negative',
            userMessage: item.userMessage,
          };
        }

        try {
          if (!item.userId.startsWith('web_')) {
            const apiKey = bot.instagramPageId ? bot.instagramApiKey : bot.facebookApiKey;
            if (!apiKey) {
              usernameCache.set(item.userId, username);
              return {
                ...item._doc,
                username,
                feedback: item.type === 'like' ? 'positive' : 'negative',
                userMessage: item.userMessage,
              };
            }
            const response = await axios.get(
              `https://graph.facebook.com/${item.userId}?fields=name&access_token=${apiKey}`
            );
            if (response.data.name) {
              username = response.data.name;
            }
          }
        } catch (err) {
          if (!usernameCache.has(item.userId)) {
            logger.warn('feedback_username_fetch_error', { botId, userId: item.userId, err: err.message });
          }
        }

        usernameCache.set(item.userId, username);

        // تحويل type إلى feedback للتوافق مع الفرونت
        return {
          ...item._doc,
          username,
          feedback: item.type === 'like' ? 'positive' : 'negative', // توافق مع الفرونت
          userMessage: item.userMessage // إضافة رسالة المستخدم للرد
        };
      })
    );

    res.status(200).json(feedbackWithUsernames);
  } catch (err) {
    logger.error('feedback_fetch_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب أكثر الردود السلبية
exports.getTopNegativeReplies = async (req, res) => {
  try {
    const { botId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { botId, type: 'dislike', isVisible: true };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const feedback = await Feedback.find(query);

    // تجميع الردود السلبية حسب المحتوى
    const negativeReplies = {};
    feedback.forEach(item => {
      if (item.messageContent) {
        if (!negativeReplies[item.messageContent]) {
          negativeReplies[item.messageContent] = 0;
        }
        negativeReplies[item.messageContent]++;
      }
    });

    // تحويل البيانات لمصفوفة مرتبة
    const result = Object.keys(negativeReplies)
      .map(content => ({
        messageContent: content,
        count: negativeReplies[content],
      }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json(result);
  } catch (err) {
    logger.error('feedback_negative_fetch_error', { botId: req.params.botId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إخفاء تقييم معين (بدل الحذف)
exports.hideFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.feedbackId;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ message: 'التقييم غير موجود' });
    }

    // إخفاء التقييم بدل الحذف
    feedback.isVisible = false;
    await feedback.save();

    res.status(200).json({ message: 'تم إخفاء التقييم بنجاح' });
  } catch (err) {
    logger.error('feedback_hide_error', { feedbackId: req.params.feedbackId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إخفاء جميع التقييمات (إيجابية أو سلبية) دفعة واحدة
exports.clearFeedbackByType = async (req, res) => {
  try {
    const botId = req.params.id;
    const type = req.params.type; // 'positive' or 'negative'

    // تحويل type من positive/negative إلى like/dislike
    const feedbackType = type === 'positive' ? 'like' : 'dislike';

    const updated = await Feedback.updateMany(
      { botId, type: feedbackType, isVisible: true },
      { $set: { isVisible: false } }
    );

    if (updated.matchedCount === 0) {
      return res.status(404).json({ message: 'لا توجد تقييمات مرئية للإخفاء' });
    }

    res.status(200).json({ message: 'تم إخفاء التقييمات بنجاح' });
  } catch (err) {
    logger.error('feedback_clear_error', { botId: req.params.id, type: req.params.type, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إنشاء بوت جديد
exports.createBot = async (req, res) => {
  const { name, userId, facebookApiKey, facebookPageId, instagramApiKey, instagramPageId, subscriptionType, welcomeMessage } = req.body;

  if (!name || !userId) {
    return res.status(400).json({ message: 'اسم البوت ومعرف المستخدم مطلوبان' });
  }

  if (facebookApiKey && !facebookPageId) {
    return res.status(400).json({ message: 'معرف صفحة الفيسبوك مطلوب عند إدخال رقم API' });
  }

  if (instagramApiKey && !instagramPageId) {
    return res.status(400).json({ message: 'معرف صفحة الإنستجرام مطلوب عند إدخال رقم API' });
  }

  if (subscriptionType && !['free', 'monthly', 'yearly'].includes(subscriptionType)) {
    return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
  }

  try {
    const bot = new Bot({ 
      name, 
      userId, 
      facebookApiKey, 
      facebookPageId,
      instagramApiKey,
      instagramPageId,
      subscriptionType: subscriptionType || 'free',
      welcomeMessage 
    });
    await bot.save();

    await User.findByIdAndUpdate(userId, { $push: { bots: bot._id } });

    res.status(201).json(bot);
  } catch (err) {
    logger.error('bot_create_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعديل بوت
exports.updateBot = async (req, res) => {
  const { name, userId, facebookApiKey, facebookPageId, instagramApiKey, instagramPageId, isActive, autoStopDate, subscriptionType, welcomeMessage } = req.body;

  try {
    logger.info('bot_update_attempt', { botId: req.params.id, userId: req.user.userId, payloadKeys: Object.keys(req.body || {}) });

    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      logger.warn('bot_update_not_found', { botId: req.params.id });
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_update_unauthorized', { botId: bot._id, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // تحديث الحقول
    bot.name = name || bot.name;
    bot.userId = userId || bot.userId;
    bot.facebookApiKey = facebookApiKey !== undefined ? facebookApiKey : bot.facebookApiKey;
    bot.facebookPageId = facebookPageId !== undefined ? facebookPageId : bot.facebookPageId;
    bot.instagramApiKey = instagramApiKey !== undefined ? instagramApiKey : bot.instagramApiKey;
    bot.instagramPageId = instagramPageId !== undefined ? instagramPageId : bot.instagramPageId;
    bot.isActive = isActive !== undefined ? isActive : bot.isActive;
    bot.autoStopDate = autoStopDate !== undefined ? autoStopDate : bot.autoStopDate;
    bot.subscriptionType = subscriptionType || bot.subscriptionType;
    bot.welcomeMessage = welcomeMessage !== undefined ? welcomeMessage : bot.welcomeMessage;

    if (facebookApiKey && !facebookPageId) {
      logger.warn('bot_update_missing_facebook_page', { botId: bot._id });
      return res.status(400).json({ message: 'معرف صفحة الفيسبوك مطلوب عند إدخال رقم API' });
    }

    if (instagramApiKey && !instagramPageId) {
      logger.warn('bot_update_missing_instagram_page', { botId: bot._id });
      return res.status(400).json({ message: 'معرف صفحة الإنستجرام مطلوب عند إدخال رقم API' });
    }

    if (subscriptionType && !['free', 'monthly', 'yearly'].includes(subscriptionType)) {
      logger.warn('bot_update_invalid_subscription', { botId: bot._id, subscriptionType });
      return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
    }

    // إذا كان هناك مستخدم جديد، تحديث قائمة البوتات في المستخدمين
    if (userId && userId !== bot.userId.toString()) {
      logger.info('bot_update_change_owner', { botId: bot._id, oldUserId: bot.userId, newUserId: userId });
      try {
        const oldUser = await User.findById(bot.userId);
        if (oldUser) {
          await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });
        } else {
          logger.warn('bot_update_old_user_missing', { botId: bot._id, oldUserId: bot.userId });
        }

        const newUser = await User.findById(userId);
        if (newUser) {
          await User.findByIdAndUpdate(userId, { $push: { bots: bot._id } });
        } else {
          logger.error('bot_update_new_user_missing', { botId: bot._id, newUserId: userId });
          return res.status(400).json({ message: 'المستخدم الجديد غير موجود' });
        }
      } catch (err) {
        logger.error('bot_update_user_list_error', { botId: bot._id, err: err.message, stack: err.stack });
        throw err;
      }
    }

    logger.info('bot_save_attempt', { botId: bot._id });
    await bot.save();
    logger.info('bot_save_success', { botId: bot._id });

    res.status(200).json(bot);
  } catch (err) {
    logger.error('bot_update_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
};

// حذف بوت
exports.deleteBot = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      logger.warn('bot_delete_not_found', { botId: req.params.id });
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يحذف أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_delete_unauthorized', { botId: bot._id, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ message: 'غير مصرح لك بحذف هذا البوت' });
    }

    await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });

    await Bot.deleteOne({ _id: req.params.id });
    logger.info('bot_deleted', { botId: req.params.id });
    res.status(200).json({ message: 'تم حذف البوت بنجاح' });
  } catch (err) {
    logger.error('bot_delete_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إلغاء ربط صفحة فيسبوك
exports.unlinkFacebookPage = async (req, res) => {
  try {
    const botId = req.params.id;
    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_unlink_fb_not_found', { botId });
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_unlink_fb_unauthorized', { botId, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // إلغاء ربط صفحة فيسبوك
    bot.facebookApiKey = '';
    bot.facebookPageId = '';
    await bot.save();

    logger.info('bot_unlink_fb_success', { botId });
    res.status(200).json({ message: 'تم إلغاء ربط الصفحة بنجاح' });
  } catch (err) {
    logger.error('bot_unlink_fb_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// إلغاء ربط حساب إنستجرام
exports.unlinkInstagramAccount = async (req, res) => {
  try {
    const botId = req.params.id;
    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_unlink_ig_not_found', { botId });
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_unlink_ig_unauthorized', { botId, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // إلغاء ربط حساب إنستجرام
    bot.instagramApiKey = '';
    bot.instagramPageId = '';
    bot.lastInstagramTokenRefresh = null; // إزالة تاريخ التجديد
    await bot.save();

    logger.info('bot_unlink_ig_success', { botId });
    res.status(200).json({ message: 'تم إلغاء ربط حساب الإنستجرام بنجاح' });
  } catch (err) {
    logger.error('bot_unlink_ig_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// ربط صفحة فيسبوك أو إنستجرام بالبوت
exports.linkSocialPage = async (req, res) => {
  try {
    const botId = req.params.id;
    const { facebookApiKey, facebookPageId, instagramApiKey, instagramPageId } = req.body;

    if ((!facebookApiKey || !facebookPageId) && (!instagramApiKey || !instagramPageId)) {
      logger.warn('bot_link_social_missing_fields', { botId });
      return res.status(400).json({ message: 'مفتاح API ومعرف الصفحة مطلوبان لفيسبوك أو إنستجرام' });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_link_social_not_found', { botId });
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يربط أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_link_social_unauthorized', { botId, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    let longLivedToken;
    let pageId;
    let platform;

    // تحديد الحقول المشترك فيها بناءً على المنصة
    let subscribedFields;
    if (facebookApiKey && facebookPageId) {
      platform = 'facebook';
      // طلب توكن طويل الأمد لفيسبوك
      const response = await axios.get(
        `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=499020366015281&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${facebookApiKey}`
      );

      if (!response.data.access_token) {
        logger.warn('facebook_exchange_missing_token', { botId, response: response.data });
        return res.status(400).json({ message: 'فشل في جلب توكن طويل الأمد: ' + (response.data.error?.message || 'غير معروف') });
      }

      longLivedToken = response.data.access_token;
      pageId = facebookPageId;

      // تحديث البوت بالتوكن ومعرف الصفحة
      bot.facebookApiKey = longLivedToken;
      bot.facebookPageId = facebookPageId;

      // حقول فيسبوك المشترك فيها (زي النسخة القديمة)
      subscribedFields = [
        'messages',
        'messaging_postbacks',
        'messaging_optins',
        'messaging_optouts',
        'messaging_referrals',
        'message_edits',
        'message_reactions',
        'inbox_labels',
        'messaging_customer_information',
        'response_feedback',
        'messaging_integrity',
        'feed'
      ].join(',');

      // الاشتراك في الـ Webhook Events لفيسبوك
      try {
        logger.info('bot_link_fb_subscribe_attempt', { botId, pageId, fields: subscribedFields });
        const subscriptionResponse = await axios.post(
          `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`,
          {
            subscribed_fields: subscribedFields,
            access_token: longLivedToken
          }
        );

        if (subscriptionResponse.data.success) {
          logger.info('bot_link_fb_subscribe_success', { botId, pageId });
        } else {
          logger.error('bot_link_fb_subscribe_failed', { botId, pageId, response: subscriptionResponse.data });
          return res.status(400).json({ message: 'فشل في الاشتراك في Webhook Events: ' + (subscriptionResponse.data.error?.message || 'غير معروف') });
        }
      } catch (err) {
        logger.error('bot_link_fb_subscribe_error', { botId, pageId, err: err.message, response: err.response?.data });
        return res.status(500).json({ message: 'خطأ أثناء الاشتراك في Webhook Events: ' + (err.response?.data?.error?.message || err.message) });
      }
    } else if (instagramApiKey && instagramPageId) {
      platform = 'instagram';
      longLivedToken = instagramApiKey;
      pageId = instagramPageId;

      // تحديث البوت بالتوكن ومعرف الصفحة
      bot.instagramApiKey = longLivedToken;
      bot.instagramPageId = instagramPageId;
    }

    await bot.save();

    logger.info('bot_link_social_success', { botId, platform, pageId });

    res.status(200).json({ message: `تم ربط صفحة ${platform} بنجاح` });
  } catch (err) {
    logger.error('bot_link_social_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// تبادل Instagram OAuth code بـ access token
exports.exchangeInstagramCode = async (req, res) => {
  try {
    const botId = req.params.id;
    const { code } = req.body;

    if (!code) {
      logger.warn('bot_exchange_code_missing', { botId });
      return res.status(400).json({ success: false, message: 'OAuth code مطلوب' });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_exchange_code_not_found', { botId });
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_exchange_code_unauthorized', { botId, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // استخدام redirect_uri ثابت
    const redirectUri = 'https://zain-ai-a06a.onrender.com/dashboard_new.html';
    logger.info('instagram_exchange_redirect', { botId, redirectUri });
    logger.info('instagram_exchange_code', { botId });

    // تبادل الـ code بـ short-lived access token
    let tokenResponse;
    try {
      logger.info('instagram_exchange_request', { botId });
      tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', new URLSearchParams({
        client_id: '2288330081539329',
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (err) {
      logger.error('instagram_exchange_error', { botId, err: err.message, response: err.response?.data });
      throw err;
    }

    if (!tokenResponse.data.access_token || !tokenResponse.data.user_id) {
      logger.warn('instagram_exchange_missing_token', { botId, response: tokenResponse.data });
      return res.status(400).json({ success: false, message: 'فشل في جلب التوكن: ' + (tokenResponse.data.error_message || 'غير معروف') });
    }

    let shortLivedToken = tokenResponse.data.access_token;
    let userId = tokenResponse.data.user_id;

    logger.info('instagram_exchange_success', { botId, userId });

    // تحويل الـ short-lived token إلى long-lived token
    let longLivedTokenResponse;
    try {
      logger.info('instagram_exchange_long_request', { botId });
      longLivedTokenResponse = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          access_token: shortLivedToken,
        },
      });
    } catch (err) {
      logger.error('instagram_exchange_long_error', { botId, err: err.message, response: err.response?.data });
      return res.status(500).json({ success: false, message: 'خطأ في جلب توكن طويل الأمد: ' + (err.response?.data?.error?.message || err.message) });
    }

    if (!longLivedTokenResponse.data.access_token) {
      logger.warn('instagram_exchange_long_missing_token', { botId, response: longLivedTokenResponse.data });
      return res.status(400).json({ success: false, message: 'فشل في جلب توكن طويل الأمد: ' + (longLivedTokenResponse.data.error?.message || 'غير معروف') });
    }

    const longLivedToken = longLivedTokenResponse.data.access_token;
    const expiresIn = longLivedTokenResponse.data.expires_in;

    logger.info('instagram_exchange_long_success', { botId, expiresIn });

    // جلب الـ user_id الصحيح باستخدام /me endpoint
    let instagramPageId;
    try {
      const userResponse = await axios.get(
        `https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${longLivedToken}`
      );
      instagramPageId = userResponse.data.user_id;
      logger.info('instagram_page_fetch_success', { botId, instagramPageId });
    } catch (err) {
      logger.error('instagram_page_fetch_error', { botId, err: err.message, response: err.response?.data });
      return res.status(500).json({ success: false, message: 'خطأ في جلب معرف الصفحة: ' + (err.response?.data?.error?.message || err.message) });
    }

    // تحديث البوت بالتوكن الطويل الأمد ومعرف الحساب
    bot.instagramApiKey = longLivedToken;
    bot.instagramPageId = instagramPageId;
    bot.lastInstagramTokenRefresh = new Date();
    await bot.save();

    res.status(200).json({ success: true, message: 'تم ربط حساب الإنستجرام بنجاح' });
  } catch (err) {
    logger.error('instagram_exchange_final_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + err.message });
  }
};

// جلب إعدادات البوت العامة (مثل أوقات العمل)
exports.getSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    logger.info('bot_settings_fetch_start', { botId });

    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_settings_not_found', { botId });
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    const settings = {
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
    };

    logger.info('bot_settings_fetch_success', { botId });
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    logger.error('bot_settings_fetch_error', { botId, err: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات البوت العامة
exports.updateSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    const { messagingOptinsEnabled, messageReactionsEnabled, messagingReferralsEnabled, messageEditsEnabled, inboxLabelsEnabled, commentsRepliesEnabled } = req.body;

    logger.info('bot_settings_update_start', { botId, data: req.body });

    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_settings_update_not_found', { botId });
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_settings_update_unauthorized', { botId, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // التحقق من القيم الـ Boolean
    const booleanFields = {
      messagingOptinsEnabled,
      messageReactionsEnabled,
      messagingReferralsEnabled,
      messageEditsEnabled,
      inboxLabelsEnabled,
      commentsRepliesEnabled,
    };

    let hasChanges = false;
    for (const [key, value] of Object.entries(booleanFields)) {
      if (value !== undefined) {
        if (typeof value !== 'boolean') {
          logger.warn('bot_settings_invalid_value', { botId, field: key, value });
          return res.status(400).json({ success: false, message: `القيمة ${key} يجب أن تكون true أو false` });
        }
        if (bot[key] !== value) {
          bot[key] = value;
          hasChanges = true;
        }
      }
    }

    // حفظ التغييرات فقط لو فيه تغييرات فعلية
    if (hasChanges) {
      await bot.save();
      logger.info('bot_settings_update_success', { botId });
    } else {
      logger.info('bot_settings_no_changes', { botId });
    }

    const updatedSettings = {
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
    };

    res.status(200).json({ success: true, data: updatedSettings });
  } catch (err) {
    logger.error('bot_settings_update_error', { botId, err: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// جلب إعدادات الإنستجرام
exports.getInstagramSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    logger.info('bot_instagram_settings_fetch_start', { botId });

    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_instagram_settings_not_found', { botId });
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    const instagramSettings = {
      instagramMessagingOptinsEnabled: bot.instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled: bot.instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled: bot.instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled: bot.instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled: bot.instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled: bot.instagramCommentsRepliesEnabled,
    };

    logger.info('bot_instagram_settings_fetch_success', { botId });
    res.status(200).json({ success: true, data: instagramSettings });
  } catch (err) {
    logger.error('bot_instagram_settings_fetch_error', { botId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات الإنستجرام
exports.updateInstagramSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    const { instagramMessagingOptinsEnabled, instagramMessageReactionsEnabled, instagramMessagingReferralsEnabled, instagramMessageEditsEnabled, instagramInboxLabelsEnabled, instagramCommentsRepliesEnabled } = req.body;

    logger.info('bot_instagram_settings_update_start', { botId, data: req.body });

    const bot = await Bot.findById(botId);
    if (!bot) {
      logger.warn('bot_instagram_settings_update_not_found', { botId });
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      logger.warn('bot_instagram_settings_update_unauthorized', { botId, ownerId: bot.userId, requester: req.user.userId });
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // التحقق من القيم الـ Boolean
    const booleanFields = {
      instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled,
    };

    let hasChanges = false;
    for (const [key, value] of Object.entries(booleanFields)) {
      if (value !== undefined) {
        if (typeof value !== 'boolean') {
          logger.warn('bot_instagram_settings_invalid_value', { botId, field: key, value });
          return res.status(400).json({ success: false, message: `القيمة ${key} يجب أن تكون true أو false` });
        }
        if (bot[key] !== value) {
          bot[key] = value;
          hasChanges = true;
        }
      }
    }

    // حفظ التغييرات فقط لو فيه تغييرات فعلية
    if (hasChanges) {
      await bot.save();
      logger.info('bot_instagram_settings_update_success', { botId });
    } else {
      logger.info('bot_instagram_settings_no_changes', { botId });
    }

    const updatedInstagramSettings = {
      instagramMessagingOptinsEnabled: bot.instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled: bot.instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled: bot.instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled: bot.instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled: bot.instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled: bot.instagramCommentsRepliesEnabled,
    };

    res.status(200).json({ success: true, data: updatedInstagramSettings });
  } catch (err) {
    logger.error('bot_instagram_settings_update_error', { botId, err: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};
module.exports = exports;
