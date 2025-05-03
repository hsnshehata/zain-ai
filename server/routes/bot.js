const express = require('express');
const router = express.Router();
const Bot = require('../models/Bot');
const authenticate = require('../middleware/authenticate');
const botEngine = require('../botEngine');

// Middleware للتحقق من صلاحية الوصول للبوت
const checkBotAccess = async (req, res, next) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    const isOwner = bot.userId.toString() === req.user._id.toString();
    const isSuperadmin = req.user.role === 'superadmin';

    if (!isOwner && !isSuperadmin) {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى هذا البوت' });
    }

    next();
  } catch (err) {
    console.error('❌ خطأ في التحقق من صلاحية الوصول للبوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب بوت معين بناءً على الـ ID
router.get('/:id', authenticate, checkBotAccess, async (req, res) => {
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
});

// معالجة رسايل الدردشة
router.post('/', async (req, res) => {
  try {
    const { botId, message, isImage } = req.body;
    if (!botId || !message) {
      return res.status(400).json({ message: 'Bot ID and message are required' });
    }

    const reply = await botEngine.processMessage(botId, 'anonymous', message, isImage);
    res.status(200).json({ reply });
  } catch (err) {
    console.error('❌ خطأ في معالجة رسالة البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء معالجة الرسالة' });
  }
});

module.exports = router;
