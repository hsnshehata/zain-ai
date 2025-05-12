const Bot = require('../models/Bot');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// جلب بوت معين بناءً على الـ ID
exports.getBot = async (req, res) => {
  try {
    console.log(`[${getTimestamp()}] 📝 محاولة جلب البوت | Bot ID: ${req.params.id} | User ID: ${req.user._id}`);
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${req.params.id}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }
    console.log(`[${getTimestamp()}] ✅ تم جلب البوت بنجاح | Bot ID: ${req.params.id}`);
    res.status(200).json(bot);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب البوت | Bot ID: ${req.params.id}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// جلب إعدادات بوت معين بناءً على الـ botId
exports.getSettings = async (req, res) => {
  try {
    const botId = req.params.id; // الحصول على botId من الـ URL
    console.log(`[${getTimestamp()}] 📝 محاولة جلب إعدادات البوت | Bot ID: ${botId} | User ID: ${req.user._id}`);
    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    console.log(`[${getTimestamp()}] ✅ تم جلب إعدادات البوت بنجاح | Bot ID: ${botId}`);
    res.status(200).json({
      messagingOptinsEnabled: bot.messagingOptinsEnabled || false,
      messageReactionsEnabled: bot.messageReactionsEnabled || false,
      messagingReferralsEnabled: bot.messagingReferralsEnabled || false,
      messageEditsEnabled: bot.messageEditsEnabled || false,
      inboxLabelsEnabled: bot.inboxLabelsEnabled || false,
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب إعدادات البوت | Bot ID: ${req.params.id}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};

// تحديث إعدادات بوت معين بناءً على الـ botId
exports.updateSettings = async (req, res) => {
  try {
    const botId = req.params.id; // الحصول على botId من الـ URL
    console.log(`[${getTimestamp()}] 📝 محاولة تحديث إعدادات البوت | Bot ID: ${botId} | User ID: ${req.user._id} | Updates:`, req.body);
    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
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
      console.log(`[${getTimestamp()}] ⚠️ لا توجد تحديثات صالحة للحفظ | Bot ID: ${botId}`);
      return res.status(400).json({ message: 'لا توجد تحديثات صالحة للحفظ' });
    }

    await Bot.updateOne({ _id: botId }, { $set: filteredUpdates });
    console.log(`[${getTimestamp()}] ✅ تم تحديث إعدادات البوت بنجاح | Bot ID: ${botId}`);

    res.status(200).json({ message: 'تم تحديث الإعدادات بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تحديث إعدادات البوت | Bot ID: ${req.params.id}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + err.message });
  }
};
