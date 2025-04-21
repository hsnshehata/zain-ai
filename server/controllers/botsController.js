const express = require('express');
const router = express.Router();
const Bot = require('../models/Bot');
const User = require('../models/User');
const Feedback = require('../models/Feedback'); // استيراد السكيما الجديدة
const authenticate = require('../middleware/authenticate');

// جلب كل البوتات
router.get('/', authenticate, async (req, res) => {
  try {
    const bots = await Bot.find().populate('userId');
    res.status(200).json(bots);
  } catch (err) {
    console.error('❌ خطأ في جلب البوتات:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// جلب التقييمات بناءً على botId
router.get('/:id/feedback', authenticate, async (req, res) => {
  try {
    const botId = req.params.id;
    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    // Check if the user is authorized to view this bot's feedback
    if (req.user.role !== 'superadmin' && bot.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح لك بعرض تقييمات هذا البوت' });
    }

    const feedback = await Feedback.find({ botId }).sort({ timestamp: -1 });
    res.status(200).json(feedback);
  } catch (err) {
    console.error('❌ خطأ في جلب التقييمات:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// إنشاء بوت جديد
router.post('/', authenticate, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بإنشاء بوت' });
  }

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

    await User.findByIdAndUpdate(userId, { $push: { bots: bot._id } });

    res.status(201).json(bot);
  } catch (err) {
    console.error('❌ خطأ في إنشاء البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// تعديل بوت
router.put('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بتعديل البوت' });
  }

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
});

// حذف بوت
router.delete('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بحذف البوت' });
  }

  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    await User.findByIdAndUpdate(bot.userId, { $pull: { bots: bot._id } });

    await Bot.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'تم حذف البوت بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
