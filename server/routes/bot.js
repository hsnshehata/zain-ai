const express = require('express');
const router = express.Router();
const Bot = require('../models/Bot');
const authenticate = require('../middleware/authenticate');

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

module.exports = router;
