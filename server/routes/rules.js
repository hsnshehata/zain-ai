const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const authenticate = require('../middleware/authenticate');

// جلب كل القواعد
router.get('/', authenticate, async (req, res) => {
  try {
    const botId = req.query.botId;
    let query = { $or: [{ botId }, { type: 'global' }] };

    // إذا كان المستخدم عادي، لا يرى القواعد الموحدة إلا إذا كانت مرتبطة ببوته
    if (req.user.role !== 'superadmin') {
      query = { botId }; // يرى القواعد الخاصة ببوته فقط + القواعد الموحدة عند الاستخدام
    }

    const rules = await Rule.find(query);
    res.status(200).json(rules);
  } catch (err) {
    console.error('❌ خطأ في جلب القواعد:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// إنشاء قاعدة جديدة
router.post('/', authenticate, async (req, res) => {
  const { botId, type, content } = req.body;

  if (!botId || !type || !content) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }

  // فقط السوبر أدمن يمكنه إنشاء قواعد موحدة (Global)
  if (type === 'global' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بإنشاء قواعد موحدة' });
  }

  try {
    const rule = new Rule({ botId, type, content });
    await rule.save();
    res.status(201).json(rule);
  } catch (err) {
    console.error('❌ خطأ في إنشاء القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// تعديل قاعدة
router.put('/:id', authenticate, async (req, res) => {
  const { type, content } = req.body;

  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }

    // فقط السوبر أدمن يمكنه تعديل القواعد الموحدة
    if (rule.type === 'global' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك بتعديل القواعد الموحدة' });
    }

    rule.type = type || rule.type;
    rule.content = content || rule.content;

    await rule.save();
    res.status(200).json(rule);
  } catch (err) {
    console.error('❌ خطأ في تعديل القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// حذف قاعدة
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }

    // فقط السوبر أدمن يمكنه حذف القواعد الموحدة
    if (rule.type === 'global' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك بحذف القواعد الموحدة' });
    }

    await Rule.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'تم حذف القاعدة بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
