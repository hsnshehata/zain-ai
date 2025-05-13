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

// جلب التقييمات بناءً على botId مع اسم المستخدم من فيسبوك (التقييمات المرئية فقط)
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
            const response = await axios.get(
              `https://graph.facebook.com/${item.userId}?fields=name&access_token=${bot.facebookApiKey}`
            );
            if (response.data.name) {
              username = response.data.name;
            }
          }
        } catch (err) {
          console.error(`[${getTimestamp()}] ❌ خطأ في جلب اسم المستخدم ${item.userId} من فيسبوك:`, err.message);
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
  const { name, userId, facebookApiKey, facebookPageId, subscriptionType, welcomeMessage } = req.body;

  if (!name || !userId) {
    return res.status(400).json({ message: 'اسم البوت ومعرف المستخدم مطلوبان' });
  }

  if (facebookApiKey && !facebookPageId) {
    return res.status(400).json({ message: 'معرف صفحة الفيسبوك مطلوب عند إدخال رقم API' });
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
  const { name, userId, facebookApiKey, facebookPageId, isActive, autoStopDate, subscriptionType, welcomeMessage } = req.body;

  try {
    console.log(`[${getTimestamp()}] 📝 محاولة تعديل البوت | Bot ID: ${req.params.id} | User ID: ${req.user.userId} | Data:`, req.body);

    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${req.params.id}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق إن المستخدم هو صاحب البوت
    if (bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // تحديث الحقول
    bot.name = name || bot.name;
    bot.userId = userId || bot.userId;
    bot.facebookApiKey = facebookApiKey !== undefined ? facebookApiKey : bot.facebookApiKey;
    bot.facebookPageId = facebookPageId !== undefined ? facebookPageId : bot.facebookPageId;
    bot.isActive = isActive !== undefined ? isActive : bot.isActive;
    bot.autoStopDate = autoStopDate !== undefined ? autoStopDate : bot.autoStopDate;
    bot.subscriptionType = subscriptionType || bot.subscriptionType;
    bot.welcomeMessage = welcomeMessage !== undefined ? welcomeMessage : bot.welcomeMessage;

    if (facebookApiKey && !facebookPageId) {
      console.log(`[${getTimestamp()}] ⚠️ معرف صفحة الفيسبوك مفقود | facebookApiKey provided without facebookPageId`);
      return res.status(400).json({ message: 'معرف صفحة الفيسبوك مطلوب عند إدخال رقم API' });
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

    // التحقق إن المستخدم هو صاحب البوت
    if (bot.userId.toString() !== req.user.userId.toString()) {
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

// ربط صفحة فيسبوك بالبوت (جديد)
exports.linkFacebookPage = async (req, res) => {
  try {
    const botId = req.params.id;
    const { facebookApiKey, facebookPageId } = req.body;

    if (!facebookApiKey || !facebookPageId) {
      console.log(`[${getTimestamp()}] ⚠️ مفتاح API أو معرف الصفحة مفقود | Bot ID: ${botId}`);
      return res.status(400).json({ message: 'مفتاح API ومعرف الصفحة مطلوبان' });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق إن المستخدم هو صاحب البوت
    if (bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // طلب توكن طويل الأمد
    const response = await axios.get(
      `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=499020366015281&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${facebookApiKey}`
    );

    if (!response.data.access_token) {
      console.log(`[${getTimestamp()}] ❌ فشل في جلب توكن طويل الأمد | Bot ID: ${botId}`);
      return res.status(400).json({ message: 'فشل في جلب توكن طويل الأمد: ' + (response.data.error?.message || 'غير معروف') });
    }

    const longLivedToken = response.data.access_token;

    // تحديث البوت بالتوكن الطويل الأمد ومعرف الصفحة
    bot.facebookApiKey = longLivedToken;
    bot.facebookPageId = facebookPageId;
    await bot.save();

    console.log(`[${getTimestamp()}] ✅ تم ربط صفحة فيسبوك بنجاح | Bot ID: ${botId} | Page ID: ${facebookPageId}`);
    res.status(200).json({ message: 'تم ربط الصفحة بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في ربط صفحة فيسبوك:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

module.exports = exports;
