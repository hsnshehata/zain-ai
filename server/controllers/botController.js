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

// جلب إعدادات التصاريح
exports.getSettings = async (req, res) => {
  try {
    const bot = await Bot.findOne({ userId: req.user._id }); // افتراض أن المستخدم ليه بوت واحد
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }
    res.status(200).json({
      messagingOptinsEnabled: bot.messagingOptinsEnabled,
      messageReactionsEnabled: bot.messageReactionsEnabled,
      messagingReferralsEnabled: bot.messagingReferralsEnabled,
      messageEditsEnabled: bot.messageEditsEnabled,
      inboxLabelsEnabled: bot.inboxLabelsEnabled,
      sendCartEnabled: bot.sendCartEnabled,
    });
  } catch (err) {
    console.error('❌ خطأ في جلب إعدادات البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تحديث إعدادات التصاريح
exports.updateSettings = async (req, res) => {
  try {
    const bot = await Bot.findOne({ userId: req.user._id });
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    const updates = req.body;
    await Bot.updateOne({ _id: bot._id }, { $set: updates });

    res.status(200).json({ message: 'تم تحديث الإعدادات بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في تحديث إعدادات البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
