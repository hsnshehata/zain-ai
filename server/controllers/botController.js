const Bot = require('../models/Bot');
const { getTimestamp } = require('./botsController');

exports.getSettings = async (req, res) => {
  try {
    console.log(`[${getTimestamp()}] 📝 محاولة جلب إعدادات البوت | Bot ID: ${req.params.id} | User ID: ${req.user.userId}`);
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${req.params.id}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى إعدادات هذا البوت' });
    }

    // تحديد نوع الإعدادات بناءً على الـ URL
    const isInstagram = req.originalUrl.includes('instagram-settings');
    const settings = isInstagram ? {
      instagramMessagingOptinsEnabled: bot.instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled: bot.instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled: bot.instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled: bot.instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled: bot.instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled: bot.instagramCommentsRepliesEnabled,
      welcomeMessage: bot.welcomeMessage,
      workingHours: bot.workingHours,
    } : {
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
      welcomeMessage: bot.welcomeMessage,
      workingHours: bot.workingHours,
    };

    console.log(`[${getTimestamp()}] ✅ تم جلب إعدادات البوت بنجاح | Bot ID: ${req.params.id}`);
    res.status(200).json(settings);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    console.log(`[${getTimestamp()}] 📝 محاولة تحديث إعدادات البوت | Bot ID: ${req.params.id} | User ID: ${req.user.userId} | Data:`, req.body);
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${req.params.id}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // التحقق من الصلاحيات: السوبر أدمن يقدر يعدل أي بوت، غير كده لازم يكون صاحب البوت
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.userId.toString()) {
      console.log(`[${getTimestamp()}] ⚠️ غير مصرح للمستخدم | Bot User ID: ${bot.userId} | Request User ID: ${req.user.userId}`);
      return res.status(403).json({ message: 'غير مصرح لك بتحديث إعدادات هذا البوت' });
    }

    const isInstagram = req.originalUrl.includes('instagram-settings');
    if (isInstagram) {
      const {
        instagramMessagingOptinsEnabled,
        instagramMessageReactionsEnabled,
        instagramMessagingReferralsEnabled,
        instagramMessageEditsEnabled,
        instagramInboxLabelsEnabled,
        instagramCommentsRepliesEnabled,
        welcomeMessage,
        workingHours,
      } = req.body;

      if (instagramMessagingOptinsEnabled !== undefined) bot.instagramMessagingOptinsEnabled = instagramMessagingOptinsEnabled;
      if (instagramMessageReactionsEnabled !== undefined) bot.instagramMessageReactionsEnabled = instagramMessageReactionsEnabled;
      if (instagramMessagingReferralsEnabled !== undefined) bot.instagramMessagingReferralsEnabled = instagramMessagingReferralsEnabled;
      if (instagramMessageEditsEnabled !== undefined) bot.instagramMessageEditsEnabled = instagramMessageEditsEnabled;
      if (instagramInboxLabelsEnabled !== undefined) bot.instagramInboxLabelsEnabled = instagramInboxLabelsEnabled;
      if (instagramCommentsRepliesEnabled !== undefined) bot.instagramCommentsRepliesEnabled = instagramCommentsRepliesEnabled;
      if (welcomeMessage !== undefined) bot.welcomeMessage = welcomeMessage;
      if (workingHours) {
        bot.workingHours = {
          start: workingHours.start || bot.workingHours.start,
          end: workingHours.end || bot.workingHours.end,
        };
      }
    } else {
      const {
        messagingOptinsEnabled,
        messageReactionsEnabled,
        messagingReferralsEnabled,
        messageEditsEnabled,
        inboxLabelsEnabled,
        commentsRepliesEnabled,
        welcomeMessage,
        workingHours,
      } = req.body;

      if (messagingOptinsEnabled !== undefined) bot.messagingOptinsEnabled = messagingOptinsEnabled;
      if (messageReactionsEnabled !== undefined) bot.messageReactionsEnabled = messageReactionsEnabled;
      if (messagingReferralsEnabled !== undefined) bot.messagingReferralsEnabled = messagingReferralsEnabled;
      if (messageEditsEnabled !== undefined) bot.messageEditsEnabled = messageEditsEnabled;
      if (inboxLabelsEnabled !== undefined) bot.inboxLabelsEnabled = inboxLabelsEnabled;
      if (commentsRepliesEnabled !== undefined) bot.commentsRepliesEnabled = commentsRepliesEnabled;
      if (welcomeMessage !== undefined) bot.welcomeMessage = welcomeMessage;
      if (workingHours) {
        bot.workingHours = {
          start: workingHours.start || bot.workingHours.start,
          end: workingHours.end || bot.workingHours.end,
        };
      }
    }

    await bot.save();
    console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات البوت بنجاح | Bot ID: ${req.params.id}`);

    const responseSettings = isInstagram ? {
      instagramMessagingOptinsEnabled: bot.instagramMessagingOptinsEnabled,
      instagramMessageReactionsEnabled: bot.instagramMessageReactionsEnabled,
      instagramMessagingReferralsEnabled: bot.instagramMessagingReferralsEnabled,
      instagramMessageEditsEnabled: bot.instagramMessageEditsEnabled,
      instagramInboxLabelsEnabled: bot.instagramInboxLabelsEnabled,
      instagramCommentsRepliesEnabled: bot.instagramCommentsRepliesEnabled,
      welcomeMessage: bot.welcomeMessage,
      workingHours: bot.workingHours,
    } : {
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      commentsRepliesEnabled: bot.commentsRepliesEnabled,
      welcomeMessage: bot.welcomeMessage,
      workingHours: bot.workingHours,
    };

    res.status(200).json(responseSettings);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
