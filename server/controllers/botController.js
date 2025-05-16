const Bot = require('../models/Bot');
const express = require('express');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// جلب إعدادات البوت العامة (مثل أوقات العمل)
exports.getSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    console.log(`[${getTimestamp()}] جاري جلب إعدادات البوت | Bot ID: ${botId}`);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    console.log(`[${getTimestamp()}] تم جلب إعدادات البوت بنجاح:`, bot.workingHours);
    res.status(200).json({
      workingHours: bot.workingHours,
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات البوت العامة
exports.updateSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    console.log(`[${getTimestamp()}] 📝 محاولة تحديث إعدادات البوت | Bot ID: ${botId} | Data:`, req.body);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    bot.workingHours = req.body.workingHours || bot.workingHours;
    bot.messagingOptinsEnabled = req.body.messagingOptinsEnabled !== undefined ? req.body.messagingOptinsEnabled : bot.messagingOptinsEnabled;
    bot.messageReactionsEnabled = req.body.messageReactionsEnabled !== undefined ? req.body.messageReactionsEnabled : bot.messageReactionsEnabled;
    bot.messagingReferralsEnabled = req.body.messagingReferralsEnabled !== undefined ? req.body.messagingReferralsEnabled : bot.messagingReferralsEnabled;
    bot.messageEditsEnabled = req.body.messageEditsEnabled !== undefined ? req.body.messageEditsEnabled : bot.messageEditsEnabled;
    bot.inboxLabelsEnabled = req.body.inboxLabelsEnabled !== undefined ? req.body.inboxLabelsEnabled : bot.inboxLabelsEnabled;
    bot.commentsRepliesEnabled = req.body.commentsRepliesEnabled !== undefined ? req.body.commentsRepliesEnabled : bot.commentsRepliesEnabled;

    await bot.save();
    console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات البوت بنجاح | Bot ID: ${botId}`);
    res.status(200).json({
      workingHours: bot.workingHours,
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب إعدادات الإنستجرام
exports.getInstagramSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    console.log(`[${getTimestamp()}] جاري جلب إعدادات الإنستجرام | Bot ID: ${botId}`);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    console.log(`[${getTimestamp()}] تم جلب إعدادات الإنستجرام بنجاح:`, {
      instagramMessagingOptinsEnabled: bot.instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled: bot.instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled: bot.instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled: bot.instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled: bot.instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled: bot.instagramCommentsRepliesEnabled,
    });

    res.status(200).json({
      instagramMessagingOptinsEnabled: bot.instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled: bot.instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled: bot.instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled: bot.instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled: bot.instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled: bot.instagramCommentsRepliesEnabled,
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات الإنستجرام:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات الإنستجرام
exports.updateInstagramSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    console.log(`[${getTimestamp()}] 📝 محاولة تحديث إعدادات الإنستجرام | Bot ID: ${botId} | Data:`, req.body);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    bot.instagramMessagingOptinsEnabled = req.body.instagramMessagingOptinsEnabled !== undefined ? req.body.instagramMessagingOptinsEnabled : bot.instagramMessagingOptinsEnabled;
    bot.instagramMessageReactionsEnabled = req.body.instagramMessageReactionsEnabled !== undefined ? req.body.instagramMessageReactionsEnabled : bot.instagramMessageReactionsEnabled;
    bot.instagramMessagingReferralsEnabled = req.body.instagramMessagingReferralsEnabled !== undefined ? req.body.instagramMessagingReferralsEnabled : bot.instagramMessagingReferralsEnabled;
    bot.instagramMessageEditsEnabled = req.body.instagramMessageEditsEnabled !== undefined ? req.body.instagramMessageEditsEnabled : bot.instagramMessageEditsEnabled;
    bot.instagramInboxLabelsEnabled = req.body.instagramInboxLabelsEnabled !== undefined ? req.body.instagramInboxLabelsEnabled : bot.instagramInboxLabelsEnabled;
    bot.instagramCommentsRepliesEnabled = req.body.instagramCommentsRepliesEnabled !== undefined ? req.body.instagramCommentsRepliesEnabled : bot.instagramCommentsRepliesEnabled;

    await bot.save();
    console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات الإنستجرام بنجاح | Bot ID: ${botId}`);
    res.status(200).json({
      instagramMessagingOptinsEnabled: bot.instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled: bot.instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled: bot.instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled: bot.instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled: bot.instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled: bot.instagramCommentsRepliesEnabled,
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات الإنستجرام:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
