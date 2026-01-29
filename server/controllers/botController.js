// server/controllers/botController.js
const Bot = require('../models/Bot');
const express = require('express');
const axios = require('axios');

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
      ownerPauseKeyword: bot.ownerPauseKeyword || '',
      ownerPauseDurationMinutes: bot.ownerPauseDurationMinutes ?? 30,
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
    const { workingHours, messagingOptinsEnabled, messageReactionsEnabled, messagingReferralsEnabled, messageEditsEnabled, inboxLabelsEnabled, commentsRepliesEnabled, ownerPauseKeyword, ownerPauseDurationMinutes } = req.body;

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

    if (workingHours) {
      if (!workingHours.start || !workingHours.end || !isValidTimeFormat(workingHours.start) || !isValidTimeFormat(workingHours.end)) {
        console.log(`[${getTimestamp()}] ⚠️ صيغة أوقات العمل غير صحيحة | Bot ID: ${botId} | Working Hours:`, workingHours);
        return res.status(400).json({ success: false, message: 'صيغة أوقات العمل غير صحيحة، يجب أن تكون HH:mm' });
      }
      bot.workingHours = workingHours;
    }

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

    if (ownerPauseKeyword !== undefined) {
      if (ownerPauseKeyword !== null && typeof ownerPauseKeyword !== 'string') {
        console.log(`[${getTimestamp()}] ⚠️ صيغة الكلمة غير صحيحة | Bot ID: ${botId} | ownerPauseKeyword:`, ownerPauseKeyword);
        return res.status(400).json({ success: false, message: 'كلمة الإيقاف يجب أن تكون نصًا' });
      }
      bot.ownerPauseKeyword = ownerPauseKeyword ? ownerPauseKeyword.trim() : '';
      hasChanges = true;
    }

    if (ownerPauseDurationMinutes !== undefined) {
      const durationNumber = Number(ownerPauseDurationMinutes);
      if (Number.isNaN(durationNumber) || durationNumber < 0 || durationNumber > 10080) {
        console.log(`[${getTimestamp()}] ⚠️ مدة الإيقاف غير صحيحة | Bot ID: ${botId} | ownerPauseDurationMinutes:`, ownerPauseDurationMinutes);
        return res.status(400).json({ success: false, message: 'مدة الإيقاف يجب أن تكون بين 0 و 10080 دقيقة' });
      }
      bot.ownerPauseDurationMinutes = durationNumber;
      hasChanges = true;
    }

    if (hasChanges || (workingHours && (workingHours.start !== bot.workingHours?.start || workingHours.end !== bot.workingHours?.end))) {
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
      ownerPauseKeyword: bot.ownerPauseKeyword || '',
      ownerPauseDurationMinutes: bot.ownerPauseDurationMinutes ?? 30,
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

// جلب إعدادات واتساب
exports.getWhatsAppSettings = async (req, res) => {
  try {
    const botId = req.params.botId;
    console.log(`[${getTimestamp()}] جاري جلب إعدادات واتساب | Bot ID: ${botId}`);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    const whatsappSettings = {
      whatsappMessagingOptinsEnabled: bot.whatsappMessagingOptinsEnabled,
      whatsappMessageReactionsEnabled: bot.whatsappMessageReactionsEnabled,
      whatsappMessagingReferralsEnabled: bot.whatsappMessagingReferralsEnabled,
      whatsappMessageEditsEnabled: bot.whatsappMessageEditsEnabled,
    };

    console.log(`[${getTimestamp()}] ✅ تم جلب إعدادات واتساب بنجاح | Bot ID: ${botId} | Settings:`, whatsappSettings);
    res.status(200).json({ success: true, data: whatsappSettings });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات واتساب:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات واتساب
exports.updateWhatsAppSettings = async (req, res) => {
  try {
    const botId = req.params.botId;
    const { whatsappMessagingOptinsEnabled, whatsappMessageReactionsEnabled, whatsappMessagingReferralsEnabled, whatsappMessageEditsEnabled } = req.body;

    console.log(`[${getTimestamp()}] 📝 محاولة تحديث إعدادات واتساب | Bot ID: ${botId} | Data:`, req.body);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    const booleanFields = {
      whatsappMessagingOptinsEnabled,
      whatsappMessageReactionsEnabled,
      whatsappMessagingReferralsEnabled,
      whatsappMessageEditsEnabled,
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

    if (hasChanges) {
      await bot.save();
      console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات واتساب بنجاح | Bot ID: ${botId}`);
    } else {
      console.log(`[${getTimestamp()}] ⚠️ لا توجد تغييرات لتحديثها | Bot ID: ${botId}`);
    }

    const updatedWhatsAppSettings = {
      whatsappMessagingOptinsEnabled: bot.whatsappMessagingOptinsEnabled,
      whatsappMessageReactionsEnabled: bot.whatsappMessageReactionsEnabled,
      whatsappMessagingReferralsEnabled: bot.whatsappMessagingReferralsEnabled,
      whatsappMessageEditsEnabled: bot.whatsappMessageEditsEnabled,
    };

    res.status(200).json({ success: true, data: updatedWhatsAppSettings });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات واتساب:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// إلغاء ربط حساب واتساب
exports.unlinkWhatsApp = async (req, res) => {
  try {
    const botId = req.params.id;
    console.log(`[${getTimestamp()}] 📝 محاولة إلغاء ربط حساب واتساب | Bot ID: ${botId}`);

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    bot.whatsappApiKey = null;
    bot.whatsappBusinessAccountId = null;
    bot.lastWhatsappTokenRefresh = null;
    await bot.save();

    console.log(`[${getTimestamp()}] ✅ تم إلغاء ربط حساب واتساب بنجاح | Bot ID: ${botId}`);
    res.status(200).json({ success: true, message: 'تم إلغاء ربط حساب واتساب بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في إلغاء ربط حساب واتساب:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// تعديل دالة linkSocial لدعم واتساب
exports.linkSocial = async (req, res) => {
  try {
    const botId = req.params.id;
    const { facebookApiKey, facebookPageId, instagramApiKey, instagramPageId, whatsappApiKey, whatsappBusinessAccountId } = req.body;

    console.log(`[${getTimestamp()}] 📝 محاولة ربط حساب اجتماعي | Bot ID: ${botId} | Data:`, req.body);

    if (!facebookApiKey && !facebookPageId && !instagramApiKey && !instagramPageId && !whatsappApiKey && !whatsappBusinessAccountId) {
      console.log(`[${getTimestamp()}] ⚠️ لا توجد بيانات للربط | Bot ID: ${botId}`);
      return res.status(400).json({ success: false, message: 'يجب توفير مفتاح API ومعرف الحساب لفيسبوك، إنستجرام، أو واتساب' });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ success: false, message: 'البوت غير موجود' });
    }

    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا البوت' });
    }

    let platform = '';
    if (facebookApiKey && facebookPageId) {
      platform = 'facebook';
      bot.facebookApiKey = facebookApiKey;
      bot.facebookPageId = facebookPageId;
      bot.lastInstagramTokenRefresh = new Date(); // تحديث تاريخ الربط
      try {
        const subscribedFields = [
          'messages',
          'message_echoes',
          'message_deliveries',
          'message_reads',
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
        const subscriptionResponse = await axios.post(
          `https://graph.facebook.com/v22.0/${facebookPageId}/subscribed_apps`,
          { subscribed_fields: subscribedFields, access_token: facebookApiKey }
        );
        if (!subscriptionResponse.data.success) {
          console.log(`[${getTimestamp()}] ❌ فشل في الاشتراك في Webhook Events لفيسبوك | Bot ID: ${botId}`);
          return res.status(400).json({ success: false, message: 'فشل في الاشتراك في Webhook Events' });
        }
      } catch (err) {
        console.error(`[${getTimestamp()}] ❌ خطأ في الاشتراك في Webhook Events لفيسبوك:`, err.message);
        return res.status(500).json({ success: false, message: 'خطأ في الاشتراك في Webhook Events' });
      }
    }
    if (instagramApiKey && instagramPageId) {
      platform = 'instagram';
      bot.instagramApiKey = instagramApiKey;
      bot.instagramPageId = instagramPageId;
      bot.lastInstagramTokenRefresh = new Date();
    }
    if (whatsappApiKey && whatsappBusinessAccountId) {
      platform = 'whatsapp';
      bot.whatsappApiKey = whatsappApiKey;
      bot.whatsappBusinessAccountId = whatsappBusinessAccountId;
      bot.lastWhatsappTokenRefresh = new Date();
    }

    await bot.save();
    console.log(`[${getTimestamp()}] ✅ تم ربط حساب ${platform} بنجاح | Bot ID: ${botId}`);
    res.status(200).json({ success: true, message: `تم ربط حساب ${platform} بنجاح` });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في ربط حساب اجتماعي:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

// تصدير getTimestamp بشكل صريح
exports.getTimestamp = getTimestamp;

module.exports = exports;
