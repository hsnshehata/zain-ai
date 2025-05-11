const express = require('express');
const Bot = require('../models/Bot');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const axios = require('axios');

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

        console.log(`✅ Bot ${bot.name} stopped due to expired subscription and notification sent to user ${bot.userId}`);
      }
    }

    res.status(200).json(bots);
  } catch (err) {
    console.error('❌ خطأ في جلب البوتات:', err.message, err.stack);
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
          console.error(`❌ خطأ في جلب اسم المستخدم ${item.userId} من فيسبوك:`, err.message);
        }

        return {
          ...item._doc,
          username,
        };
      })
    );

    res.status(200).json(feedbackWithUsernames);
  } catch (err) {
    console.error('❌ خطأ في جلب التقييمات:', err.message, err.stack);
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
    console.error('❌ خطأ في جلب الردود السلبية:', err.message, err.stack);
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
    console.error('❌ خطأ في إخفاء التقييم:', err.message, err.stack);
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
    console.error('❌ خطأ في إخفاء التقييمات:', err.message, err.stack);
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
    console.error('❌ خطأ في إنشاء البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعديل بوت
exports.updateBot = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بتعديل البوت' });
  }

  const { name, userId, facebookApiKey, facebookPageId, isActive, autoStopDate, subscriptionType, welcomeMessage } = req.body;

  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
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
      return res.status(400).json({ message: 'معرف صفحة الفيسبوك مطلوب عند إدخال رقم API' });
    }

    if (subscriptionType && !['free', 'monthly', 'yearly'].includes(subscriptionType)) {
      return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
    }

    // إذا كان هناك مستخدم جديد، تحديث قائمة البوتات في المستخدمين
    if (userId && userId !== bot.userId.toString()) {
      // إزالة البوت من المستخدم القديم
      await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });
      // إضافة البوت للمستخدم الجديد
      await User.findByIdAndUpdate(userId, { $push: { bots: bot._id } });
    }

    await bot.save();
    res.status(200).json(bot);
  } catch (err) {
    console.error('❌ خطأ في تعديل البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// حذف بوت
exports.deleteBot = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بحذف البوت' });
  }

  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });

    await Bot.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'تم حذف البوت بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

module.exports = exports;
