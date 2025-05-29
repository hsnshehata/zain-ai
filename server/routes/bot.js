// server/routes/bot.js
const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getWhatsAppSettings, updateWhatsAppSettings } = require('../controllers/botController');
const authenticate = require('../middleware/authenticate');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const botEngine = require('../botEngine');
const NodeCache = require('node-cache');

// إعداد cache لتخزين الطلبات مؤقتاً (5 دقايق)
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Routes for settings with botId in the URL
router.get('/:id/settings', authenticate, getSettings);
router.patch('/:id/settings', authenticate, updateSettings);

// Routes جديدة لإعدادات واتساب
router.get('/:botId/whatsapp-settings', authenticate, getWhatsAppSettings);
router.patch('/:botId/whatsapp-settings', authenticate, updateWhatsAppSettings);

// معالجة رسايل الدردشة
router.post('/', async (req, res) => {
  try {
    const { botId, message, userId, isImage } = req.body;
    console.log(`[POST /api/bot] 📥 Raw request body:`, req.body);
    if (!botId || !message || !userId) {
      console.error(`[POST /api/bot] ❌ Missing required fields: botId=${botId}, message=${message}, userId=${userId}`);
      return res.status(400).json({ message: 'Bot ID, message, and user ID are required' });
    }

    // التحقق من حالة البوت
    const bot = await Bot.findById(botId);
    if (!bot) {
      console.log(`[POST /api/bot] البوت غير موجود | Bot ID: ${botId}`);
      return res.status(404).json({ message: 'البوت غير موجود' });
    }
    if (!bot.isActive) {
      console.log(`[POST /api/bot] ⚠️ Bot ${bot.name} (ID: ${botId}) is inactive, skipping message processing.`);
      return res.status(400).json({ message: 'البوت متوقف حاليًا ولا يمكنه استقبال الرسائل' });
    }

    // فحص تكرار الطلب
    const messageKey = `${botId}-${userId}-${message}-${Date.now()}`;
    if (apiCache.get(messageKey)) {
      console.log(`[POST /api/bot] ⚠️ Duplicate API request detected with key ${messageKey}, skipping...`);
      return res.status(200).json({ reply: 'تم معالجة هذه الرسالة من قبل' });
    }
    apiCache.set(messageKey, true);

    // جلب المحادثة
    let conversation = await Conversation.findOne({ botId, userId, channel: 'web' });
    if (!conversation) {
      console.log('📋 Creating new conversation for bot:', botId, 'user:', userId, 'channel: web');
      conversation = new Conversation({
        botId,
        userId,
        messages: [],
        channel: 'web'
      });
      await conversation.save();
    }

    // فحص إذا كانت الرسالة موجودة
    const messageExists = conversation.messages.some(msg => 
      msg.content === message && 
      Math.abs(new Date(msg.timestamp) - Date.now()) < 1000
    );
    if (messageExists) {
      console.log(`[POST /api/bot] ⚠️ Duplicate message detected in conversation for user ${userId}, skipping...`);
      return res.status(200).json({ reply: 'تم معالجة هذه الرسالة من قبل' });
    }

    const reply = await botEngine.processMessage(botId, userId, message, isImage, false, null, 'web');
    res.status(200).json({ reply });
  } catch (err) {
    console.error(`[POST /api/bot] ❌ خطأ في معالجة رسالة البوت:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء معالجة الرسالة' });
  }
});

module.exports = router;
