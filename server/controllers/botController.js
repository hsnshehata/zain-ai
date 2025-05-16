const Bot = require('../models/Bot');
const express = require('express');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// دالة مساعدة للتحقق من صيغة الوقت (HH:mm)
const isValidTimeFormat = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// جلب إعدادات البوت العامة (مثل أوقات العمل)
exports.getSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    console.log(`[${getTimestamp()}] جاري جلب إعدادات البوت | Bot ID: ${botId}`);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    const settings = {
      workingHours: bot.workingHours,
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
    };

    console.log(`[${getTimestamp()}] ✅ تم جلب إعدادات البوت بنجاح:`, settings);
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات البوت العامة
exports.updateSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    const { workingHours, messagingOptinsEnabled, messageReactionsEnabled, messagingReferralsEnabled, messageEditsEnabled, inboxLabelsEnabled, commentsRepliesEnabled } = req.body;

    console.log(`[${getTimestamp()}] 📝 محاولة تحديث إعدادات البوت | Bot ID: ${botId} | Data:`, req.body);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    // التحقق من صيغة workingHours لو موجود
    if (workingHours) {
      if (!workingHours.start || !workingHours.end || !isValidTimeFormat(workingHours.start) || !isValidTimeFormat(workingHours.end)) {
        console.log(`[${getTimestamp()}] ⚠️ صيغة أوقات العمل غير صحيحة | Bot ID: ${botId} | Working Hours:`, workingHours);
        return res.status(400).json({ success: false, message: 'صيغة أوقات العمل غير صحيحة، يجب أن تكون HH:mm' });
      }
      bot.workingHours = workingHours;
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
          console.log(`[${getTimestamp()}] ⚠️ القيمة غير صحيحة | Bot ID: ${botId} | Field: ${key} | Value: ${value}`);
          return res.status(400).json({ success: false, message: `القيمة ${key} يجب أن تكون true أو false` });
        }
        if (bot[key] !== value) {
          bot[key] = value;
          hasChanges = true;
        }
      }
    }

    // حفظ التغييرات فقط لو فيه تغييرات فعلية
    if (hasChanges || (workingHours && (workingHours.start !== bot.workingHours.start || workingHours.end !== bot.workingHours.end))) {
      await bot.save();
      console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات البوت بنجاح | Bot ID: ${botId}`);
    } else {
      console.log(`[${getTimestamp()}] ⚠️ لا توجد تغييرات لتحديثها | Bot ID: ${botId}`);
    }

    const updatedSettings = {
      workingHours: bot.workingHours,
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
    };

    res.status(200).json({ success: true, data: updatedSettings });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
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

    console.log(`[${getTimestamp()}] ✅ تم جلب إعدادات الإنستجرام بنجاح | Bot ID: ${botId} | Settings:`, instagramSettings);
    res.status(200).json({ success: true, data: instagramSettings });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات الإنستجرام:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات الإنستجرام
exports.updateInstagramSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    const { instagramMessagingOptinsEnabled, instagramMessageReactionsEnabled, instagramMessagingReferralsEnabled, instagramMessageEditsEnabled, instagramInboxLabelsEnabled, instagramCommentsRepliesEnabled } = req.body;

    console.log(`[${getTimestamp()}] 📝 محاولة تحديث إعدادات الإنستجرام | Bot ID: ${botId} | Data:`, req.body);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
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
          console.log(`[${getTimestamp()}] ⚠️ القيمة غير صحيحة | Bot ID: ${botId} | Field: ${key} | Value: ${value}`);
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
      console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات الإنستجرام بنجاح | Bot ID: ${botId}`);
    } else {
      console.log(`[${getTimestamp()}] ⚠️ لا توجد تغييرات لتحديثها | Bot ID: ${botId}`);
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
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات الإنستجرام:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};
