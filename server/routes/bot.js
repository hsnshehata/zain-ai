const express = require('express');
const router = express.Router();
const Bot = require('../models/Bot');
const authenticate = require('../middleware/authenticate');
const botEngine = require('../botEngine');
const NodeCache = require('node-cache');
const Conversation = require('../models/Conversation');

// إعداد cache لتخزين الطلبات مؤقتاً (5 دقايق)
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// جلب بوت معين بناءً على الـ ID
router.get('/:id', authenticate, async (req, res) => {
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

    // فحص تكرار الطلب
    const messageKey = `${botId}-anonymous-${message}-${Date.now()}`;
    if (apiCache.get(messageKey)) {
      console.log(`⚠️ Duplicate API request detected with key ${messageKey}, skipping...`);
      return res.status(200).json({ reply: 'تم معالجة هذه الرسالة من قبل' });
    }
    apiCache.set(messageKey, true);

    // جلب المحادثة
    let conversation = await Conversation.findOne({ botId, userId: 'anonymous' });
    if (!conversation) {
      conversation = new Conversation({
        botId,
        userId: 'anonymous',
        messages: [],
      });
      await conversation.save();
    }

    // فحص إذا كانت الرسالة موجودة
    const messageExists = conversation.messages.some(msg => 
      msg.content === message && 
      Math.abs(new Date(msg.timestamp) - Date.now()) < 1000
    );
    if (messageExists) {
      console.log(`⚠️ Duplicate message detected in conversation for anonymous user, skipping...`);
      return res.status(200).json({ reply: 'تم معالجة هذه الرسالة من قبل' });
    }

    const reply = await botEngine.processMessage(botId, 'anonymous', message, isImage);
    res.status(200).json({ reply });
  } catch (err) {
    console.error('❌ خطأ في معالجة رسالة البوت:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء معالجة الرسالة' });
  }
});

module.exports = router;
