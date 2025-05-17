const express = require('express');
const Bot = require('../models/Bot');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const axios = require('axios');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

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

        console.log(`[${getTimestamp()}] ✅ Bot ${bot.name} stopped due to expired subscription and notification sent to user ${bot.userId}`);
      }
    }

    res.status(200).json(bots);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب البوتات:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب التقييمات بناءً على botId مع اسم المستخدم من فيسبوك/إنستجرام (التقييمات المرئية فقط)
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

    const feedbackWithUsernames = await Promise.all(
      feedback.map(async (item) => {
        let username = item.userId;
        try {
          if (!item.userId.startsWith('web_')) {
            const apiKey = bot.instagramPageId ? bot.instagramApiKey : bot.facebookApiKey;
            const response = await axios.get(
              `https://graph.facebook.com/${item.userId}?fields=name&access_token=${apiKey}`
            );
            if (response.data.name) {
              username = response.data.name;
            }
          }
        } catch (err) {
          console.error(`[${getTimestamp()}] ❌ خطأ في جلب اسم المستخدم ${item.userId} من فيسبوك/إنستجرام:`, err.message);
        }

        return {
          ...item._doc,
          username,
        };
      })
    );

    res.status(200).json(feedbackWithUsernames);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب التقييمات:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب أكثر الردود السلبية
exports.getTopNegativeReplies = async (req, res) => {
  try {
    const { botId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { botId, feedback: 'negative', isVisible: true };
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
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب الردود السلبية:`, err.message, err.stack);
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
    console.error(`[${getTimestamp()}] ❌ خطأ في إخفاء التقييم:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إخفاء جميع التقييمات (إيجابية أو سلبية) دفعة واحدة
exports.clearFeedbackByType = async (req, res) => {
  try {
    const botId = req.params.id;
    const type = req.params.type; // 'positive' or 'negative'

    const updated = await Feedback.updateMany(
      { botId, feedback: type, isVisible: true },
      { $set: { isVisible: false } }
    );

    if (updated.matchedCount === 0) {
      return res.status(404).json({ message: 'لا توجد تقييمات مرئية للإخفاء' });
    }

    res.status(200).json({ message: 'تم إخفاء التقييمات بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في إخفاء التقييمات:`, err.message, err.stack);
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
    console.error(`[${getTimestamp()}] ❌ خطأ في إنشاء البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعديل بوت
exports.updateBot = async (req, res) => {
  const { name, userId, facebookApiKey, facebookPageId, instagramApiKey, instagramPageId, isActive, autoStopDate, subscriptionType, welcomeMessage } = req.body;

  try {
    console.log(`[${getTimestamp()}] 📝 محاولة تعديل البوت | Bot ID: ${req.params.id} | User ID: ${req.user.userId} | Data:`, req.body);

    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${req.params.id}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
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
      console.log(`[${getTimestamp()}] ⚠️ معرف صفحة الفيسبوك مفقود | facebookApiKey provided without facebookPageId`);
      return res.status(400).json({ message: 'معرف صفحة الفيسبوك مطلوب عند إدخال رقم API' });
    }

    if (instagramApiKey && !instagramPageId) {
      console.log(`[${getTimestamp()}] ⚠️ معرف صفحة الإنستجرام مفقود | instagramApiKey provided without instagramPageId`);
      return res.status(400).json({ message: 'معرف صفحة الإنستجرام مطلوب عند إدخال رقم API' });
    }

    if (subscriptionType && !['free', 'monthly', 'yearly'].includes(subscriptionType)) {
      console.log(`[${getTimestamp()}] ⚠️ نوع الاشتراك غير صالح | Subscription Type: ${subscriptionType}`);
      return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
    }

    // إذا كان هناك مستخدم جديد، تحديث قائمة البوتات في المستخدمين
    if (userId && userId !== bot.userId.toString()) {
      console.log(`[${getTimestamp()}] 🔄 تحديث userId | Old User ID: ${bot.userId} | New User ID: ${userId}`);
      try {
        const oldUser = await User.findById(bot.userId);
        if (oldUser) {
          await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });
        } else {
          console.warn(`[${getTimestamp()}] ⚠️ المستخدم القديم غير موجود | Old User ID: ${bot.userId}`);
        }

        const newUser = await User.findById(userId);
        if (newUser) {
          await User.findByIdAndUpdate(userId, { $push: { bots: bot._id } });
        } else {
          console.error(`[${getTimestamp()}] ❌ المستخدم الجديد غير موجود | New User ID: ${userId}`);
          return res.status(400).json({ message: 'المستخدم الجديد غير موجود' });
        }
      } catch (err) {
        console.error(`[${getTimestamp()}] ❌ خطأ في تحديث قائمة البوتات في المستخدمين:`, err.message, err.stack);
        throw err;
      }
    }

    console.log(`[${getTimestamp()}] 💾 محاولة حفظ البوت | Bot ID: ${bot._id} | Updated Data:`, bot);
    await bot.save();
    console.log(`[${getTimestamp()}] ✅ تم حفظ البوت بنجاح | Bot ID: ${bot._id}`);

    res.status(200).json(bot);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تعديل البوت | Bot ID: ${req.params.id} | Error:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
};

// حذف بوت
exports.deleteBot = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${req.params.id}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يحذف أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بحذف هذا البوت' });
    }

    await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });

    await Bot.deleteOne({ _id: req.params.id });
    console.log(`[${getTimestamp()}] ✅ تم حذف البوت بنجاح | Bot ID: ${req.params.id}`);
    res.status(200).json({ message: 'تم حذف البوت بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في حذف البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إلغاء ربط صفحة فيسبوك
exports.unlinkFacebookPage = async (req, res) => {
  try {
    const botId = req.params.id;
    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // إلغاء ربط صفحة فيسبوك
    bot.facebookApiKey = '';
    bot.facebookPageId = '';
    await bot.save();

    console.log(`[${getTimestamp()}] ✅ تم إلغاء ربط صفحة فيسبوك بنجاح | Bot ID: ${botId}`);
    res.status(200).json({ message: 'تم إلغاء ربط الصفحة بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في إلغاء ربط صفحة فيسبوك:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// إلغاء ربط حساب إنستجرام
exports.unlinkInstagramAccount = async (req, res) => {
  try {
    const botId = req.params.id;
    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // إلغاء ربط حساب إنستجرام
    bot.instagramApiKey = '';
    bot.instagramPageId = '';
    bot.lastInstagramTokenRefresh = null; // إزالة تاريخ التجديد
    await bot.save();

    console.log(`[${getTimestamp()}] ✅ تم إلغاء ربط حساب إنستجرام بنجاح | Bot ID: ${botId}`);
    res.status(200).json({ message: 'تم إلغاء ربط حساب الإنستجرام بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في إلغاء ربط حساب إنستجرام:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// ربط صفحة فيسبوك أو إنستجرام بالبوت
exports.linkSocialPage = async (req, res) => {
  try {
    const botId = req.params.id;
    const { facebookApiKey, facebookPageId, instagramApiKey, instagramPageId } = req.body;

    if ((!facebookApiKey || !facebookPageId) && (!instagramApiKey || !instagramPageId)) {
      console.log(`[${getTimestamp()}] ⚠️ مفتاح API أو معرف الصفحة مفقود | Bot ID: ${botId}`);
      return res.status(400).json({ message: 'مفتاح API ومعرف الصفحة مطلوبان لفيسبوك أو إنستجرام' });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يربط أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
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
        console.log(`[${getTimestamp()}] ❌ فشل في جلب توكن طويل الأمد لفيسبوك | Bot ID: ${botId}`);
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
        console.log(`[${getTimestamp()}] 🔄 Attempting to subscribe to Webhook Events for bot ${botId} | Page ID: ${pageId}`);
        const subscriptionResponse = await axios.post(
          `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`,
          {
            subscribed_fields: subscribedFields,
            access_token: longLivedToken
          }
        );

        if (subscriptionResponse.data.success) {
          console.log(`[${getTimestamp()}] ✅ تم الاشتراك في Webhook Events بنجاح | Bot ID: ${botId} | Fields: ${subscribedFields}`);
        } else {
          console.error(`[${getTimestamp()}] ❌ فشل في الاشتراك في Webhook Events | Bot ID: ${botId} | Response:`, subscriptionResponse.data);
          return res.status(400).json({ message: 'فشل في الاشتراك في Webhook Events: ' + (subscriptionResponse.data.error?.message || 'غير معروف') });
        }
      } catch (err) {
        console.error(`[${getTimestamp()}] ❌ خطأ أثناء الاشتراك في Webhook Events | Bot ID: ${botId} | Error:`, err.message, err.response?.data);
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

    console.log(`[${getTimestamp()}] ✅ تم ربط صفحة ${platform} بنجاح | Bot ID: ${botId} | Page ID: ${pageId}`);

    res.status(200).json({ message: `تم ربط صفحة ${platform} بنجاح` });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في ربط صفحة فيسبوك/إنستجرام:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// تبادل Instagram OAuth code بـ access token
exports.exchangeInstagramCode = async (req, res) => {
  try {
    const botId = req.params.id;
    const { code } = req.body;

    if (!code) {
      console.log(`[${getTimestamp()}] ⚠️ OAuth code مفقود | Bot ID: ${botId}`);
      return res.status(400).json({ success: false, message: 'OAuth code مطلوب' });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // استخدام redirect_uri ثابت
    const redirectUri = 'https://zain-ai-a06a.onrender.com/dashboard_new.html';
    console.log(`[${getTimestamp()}] 📌 الـ redirect_uri المستخدم: ${redirectUri}`);
    console.log(`[${getTimestamp()}] 📌 الـ code المستخدم: ${code}`);

    // تبادل الـ code بـ short-lived access token
    let tokenResponse;
    try {
      console.log(`[${getTimestamp()}] 🔄 Sending OAuth token exchange request for bot ${botId}`);
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
      console.error(`[${getTimestamp()}] ❌ خطأ في تبادل OAuth code | Bot ID: ${botId} | Error:`, err.message, err.response?.data);
      throw err;
    }

    if (!tokenResponse.data.access_token || !tokenResponse.data.user_id) {
      console.log(`[${getTimestamp()}] ❌ فشل في تبادل OAuth code | Bot ID: ${botId} | Response:`, tokenResponse.data);
      return res.status(400).json({ success: false, message: 'فشل في جلب التوكن: ' + (tokenResponse.data.error_message || 'غير معروف') });
    }

    let shortLivedToken = tokenResponse.data.access_token;
    let userId = tokenResponse.data.user_id;

    console.log(`[${getTimestamp()}] ✅ تم تبادل OAuth code بنجاح | Bot ID: ${botId} | User ID: ${userId} | Short-Lived Token: ${shortLivedToken.slice(0, 10)}...`);

    // تحويل الـ short-lived token إلى long-lived token
    let longLivedTokenResponse;
    try {
      console.log(`[${getTimestamp()}] 🔄 Sending request to exchange short-lived token for long-lived token for bot ${botId}`);
      longLivedTokenResponse = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          access_token: shortLivedToken,
        },
      });
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ خطأ في تبادل Short-Lived Token بـ Long-Lived Token | Bot ID: ${botId} | Error:`, err.message, err.response?.data);
      return res.status(500).json({ success: false, message: 'خطأ في جلب توكن طويل الأمد: ' + (err.response?.data?.error?.message || err.message) });
    }

    if (!longLivedTokenResponse.data.access_token) {
      console.log(`[${getTimestamp()}] ❌ فشل في جلب Long-Lived Token | Bot ID: ${botId} | Response:`, longLivedTokenResponse.data);
      return res.status(400).json({ success: false, message: 'فشل في جلب توكن طويل الأمد: ' + (longLivedTokenResponse.data.error?.message || 'غير معروف') });
    }

    const longLivedToken = longLivedTokenResponse.data.access_token;
    const expiresIn = longLivedTokenResponse.data.expires_in;

    console.log(`[${getTimestamp()}] ✅ تم جلب Long-Lived Token بنجاح | Bot ID: ${botId} | Token: ${longLivedToken.slice(0, 10)}... | Expires In: ${expiresIn} seconds`);

    // جلب الـ user_id الصحيح باستخدام /me endpoint
    let instagramPageId;
    try {
      const userResponse = await axios.get(
        `https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${longLivedToken}`
      );
      instagramPageId = userResponse.data.user_id;
      console.log(`[${getTimestamp()}] ✅ تم جلب Instagram Page ID بنجاح | Bot ID: ${botId} | Page ID: ${instagramPageId}`);
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ خطأ في جلب Instagram Page ID | Bot ID: ${botId} | Error:`, err.message, err.response?.data);
      return res.status(500).json({ success: false, message: 'خطأ في جلب معرف الصفحة: ' + (err.response?.data?.error?.message || err.message) });
    }

    // تحديث البوت بالتوكن الطويل الأمد ومعرف الحساب
    bot.instagramApiKey = longLivedToken;
    bot.instagramPageId = instagramPageId;
    bot.lastInstagramTokenRefresh = new Date();
    await bot.save();

    res.status(200).json({ success: true, message: 'تم ربط حساب الإنستجرام بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تبادل OAuth code:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + err.message });
  }
};

// تصدير getTimestamp بشكل صريح
exports.getTimestamp = getTimestamp;

module.exports = exports;
