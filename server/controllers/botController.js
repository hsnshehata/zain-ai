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
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
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
    // الحقول المسموح بتحديثها بناءً على السكيما
    const allowedUpdates = [
      'messagingOptinsEnabled',
      'messageReactionsEnabled',
      'messagingReferralsEnabled',
      'messageEditsEnabled',
      'inboxLabelsEnabled',
    ];
    // فلترة التحديثات عشان تتضمن الحقول المسموح بيها بس
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

    res.status(200).json({ message: 'تم تحديث الإعدادات بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في تحديث إعدادات البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};
