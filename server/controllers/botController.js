const Bot = require('../models/Bot');

// جلب بوت معين بناءً على الـ ID
exports.getBot = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }
    res.status(200).json(bot);
  } catch (err) {
    console.error('❌ خطأ في جلب البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب إعدادات بوت معين بناءً على الـ botId
exports.getSettings = async (req, res) => {
  try {
    const botId = req.params.id; // الحصول على botId من الـ URL
    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    res.status(200).json({
      messagingOptinsEnabled: bot.messagingOptinsEnabled || false,
      messageReactionsEnabled: bot.messageReactionsEnabled || false,
      messagingReferralsEnabled: bot.messagingReferralsEnabled || false,
      messageEditsEnabled: bot.messageEditsEnabled || false,
      inboxLabelsEnabled: bot.inboxLabelsEnabled || false,
      sendCartEnabled: bot.sendCartEnabled || false,
    });
  } catch (err) {
    console.error('❌ خطأ في جلب إعدادات البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// تحديث إعدادات بوت معين بناءً على الـ botId
exports.updateSettings = async (req, res) => {
  try {
    const botId = req.params.id; // الحصول على botId من الـ URL
    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    const updates = req.body;
    await Bot.updateOne({ _id: botId }, { $set: updates });

    res.status(200).json({ message: 'تم تحديث الإعدادات بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في تحديث إعدادات البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};
