const Bot = require('../models/Bot');
const User = require('../models/User');

// جلب كل البوتات
exports.getBots = async (req, res) => {
  try {
    const bots = await Bot.find().populate('userId');
    res.status(200).json(bots);
  } catch (err) {
    console.error('❌ خطأ في جلب البوتات:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إنشاء بوت جديد
exports.createBot = async (req, res) => {
  const { name, userId, facebookApiKey, facebookPageId } = req.body;

  if (!name || !userId) {
    return res.status(400).json({ message: 'اسم البوت ومعرف المستخدم مطلوبان' });
  }

  if (facebookApiKey && !facebookPageId) {
    return res.status(400).json({ message: 'معرف صفحة الفيسبوك مطلوب عند إدخال رقم API' });
  }

  try {
    const bot = new Bot({ name, userId, facebookApiKey, facebookPageId });
    await bot.save();

    // إضافة البوت للمستخدم
    await User.findByIdAndUpdate(userId, { $push: { bots: bot._id } });

    res.status(201).json(bot);
  } catch (err) {
    console.error('❌ خطأ في إنشاء البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعديل بوت
exports.updateBot = async (req, res) => {
  const { name, facebookApiKey, facebookPageId } = req.body;

  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    bot.name = name || bot.name;
    bot.facebookApiKey = facebookApiKey !== undefined ? facebookApiKey : bot.facebookApiKey;
    bot.facebookPageId = facebookPageId !== undefined ? facebookPageId : bot.facebookPageId;

    await bot.save();
    res.status(200).json(bot);
  } catch (err) {
    console.error('❌ خطأ في تعديل البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// حذف بوت
exports.deleteBot = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // إزالة البوت من المستخدم
    await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });

    await Bot.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'تم حذف البوت بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
