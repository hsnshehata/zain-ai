const Bot = require('../models/Bot');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// جلب إعدادات البوت
exports.getSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    console.log(`[${getTimestamp()}] 📝 محاولة جلب إعدادات البوت | Bot ID: ${botId} | User ID: ${req.user.userId}`);
    const settings = {
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
    };
    console.log(`[${getTimestamp()}] ✅ تم جلب إعدادات البوت بنجاح | Bot ID: ${botId}`);
    res.status(200).json(settings);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// تحديث إعدادات البوت
exports.updateSettings = async (req, res) => {
  try {
    const botId = req.params.id;
    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    const updates = req.body;
    const allowedUpdates = [
      'messagingOptinsEnabled',
      'messageReactionsEnabled',
      'messagingReferralsEnabled',
      'messageEditsEnabled',
      'inboxLabelsEnabled',
    ];
    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ message: 'لا توجد تحديثات صالحة للحفظ' });
    }

    await Bot.updateOne({ _id: botId }, { $set: filteredUpdates });

    console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات البوت بنجاح | Bot ID: ${botId} | Updates:`, filteredUpdates);
    res.status(200).json({ message: 'تم تحديث الإعدادات بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

module.exports = exports;
