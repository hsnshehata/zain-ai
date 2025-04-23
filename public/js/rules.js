const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const authenticate = require('../middleware/authenticate');

// جلب كل القواعد مع دعم الفلترة والبحث والـ pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const botId = req.query.botId;
    const type = req.query.type; // نوع القاعدة (اختياري)
    const search = req.query.search; // كلمة البحث (اختياري)
    const page = parseInt(req.query.page) || 1; // رقم الصفحة
    const limit = parseInt(req.query.limit) || 30; // عدد القواعد لكل صفحة

    if (!botId) {
      return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
    }

    let query = { $or: [{ botId }, { type: 'global' }] };
    if (req.user.role !== 'superadmin') {
      query = { botId }; // المستخدم العادي يشوف قواعده فقط
    }

    // فلترة حسب نوع القاعدة
    if (type && type !== 'all') {
      query = { ...query, type };
    }

    // البحث في content
    if (search) {
      query.$or = [
        { 'content.question': { $regex: search, $options: 'i' } },
        { 'content.answer': { $regex: search, $options: 'i' } },
        { 'content.product': { $regex: search, $options: 'i' } },
        { 'content.apiKey': { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const totalRules = await Rule.countDocuments(query);
    const rules = await Rule.find(query)
      .sort({ createdAt: -1 }) // ترتيب تنازلي حسب تاريخ الإنشاء
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      rules,
      totalPages: Math.ceil(totalRules / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error('❌ خطأ في جلب القواعد:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء جلب القواعد', error: err.message });
  }
});

// جلب قاعدة محددة
router.get('/:id', authenticate, async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }
    // التأكد إن المستخدم العادي ما يشوفش القواعد الموحدة
    if (rule.type === 'global' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك برؤية هذه القاعدة الموحدة' });
    }
    res.status(200).json(rule);
  } catch (err) {
    console.error('❌ خطأ في جلب القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء جلب القاعدة', error: err.message });
  }
});

// إنشاء قاعدة جديدة
router.post('/', authenticate, async (req, res) => {
  const { botId, type, content } = req.body;

  // التحقق من الحقول الأساسية
  if (!botId || !type || !content) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة (botId, type, content)' });
  }

  // التحقق من صلاحيات السوبر أدمن للقواعد الموحدة
  if (type === 'global' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بإنشاء قواعد موحدة' });
  }

  // التحقق من نوع القاعدة
  const validTypes = ['general', 'products', 'qa', 'global', 'api'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'نوع القاعدة غير صالح' });
  }

  // التحقق من هيكلية content بناءً على نوع القاعدة
  if (type === 'general' || type === 'global') {
    if (typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ message: 'المحتوى يجب أن يكون سلسلة نصية غير فارغة' });
    }
  } else if (type === 'products') {
    if (!content.product || !content.price || !content.currency) {
      return res.status(400).json({ message: 'حقول المنتج والسعر والعملة مطلوبة' });
    }
    if (typeof content.price !== 'number' || content.price <= 0) {
      return res.status(400).json({ message: 'السعر يجب أن يكون رقمًا موجبًا' });
    }
    if (!['جنيه', 'دولار'].includes(content.currency)) {
      return res.status(400).json({ message: 'العملة يجب أن تكون جنيه أو دولار' });
    }
  } else if (type === 'qa') {
    if (!content.question || !content.answer) {
      return res.status(400).json({ message: 'حقول السؤال والإجابة مطلوبة' });
    }
    if (typeof content.question !== 'string' || typeof content.answer !== 'string') {
      return res.status(400).json({ message: 'السؤال والإجابة يجب أن يكونا سلسلتين نصيتين' });
    }
  } else if (type === 'api') {
    if (!content.apiKey || typeof content.apiKey !== 'string' || content.apiKey.trim() === '') {
      return res.status(400).json({ message: 'مفتاح API يجب أن يكون سلسلة نصية غير فارغة' });
    }
  }

  try {
    console.log('📥 البيانات المرسلة إلى MongoDB:', { botId, type, content });
    const rule = new Rule({ botId, type, content });
    await rule.save();
    console.log('✅ تم حفظ القاعدة بنجاح:', rule);
    res.status(201).json(rule);
  } catch (err) {
    console.error('❌ خطأ في إنشاء القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء إنشاء القاعدة', error: err.message });
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

    if (rule.type === 'global' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك بتعديل القواعد الموحدة' });
    }

    // التحقق من نوع القاعدة إذا تم إرساله
    if (type) {
      const validTypes = ['general', 'products', 'qa', 'global', 'api'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'نوع القاعدة غير صالح' });
      }
    }

    // التحقق من هيكلية content إذا تم إرساله
    if (content) {
      if (type === 'general' || type === 'global') {
        if (typeof content !== 'string' || content.trim() === '') {
          return res.status(400).json({ message: 'المحتوى يجب أن يكون سلسلة نصية غير فارغة' });
        }
      } else if (type === 'products') {
        if (!content.product || !content.price || !content.currency) {
          return res.status(400).json({ message: 'حقول المنتج والسعر والعملة مطلوبة' });
        }
        if (typeof content.price !== 'number' || content.price <= 0) {
          return res.status(400).json({ message: 'السعر يجب أن يكون رقمًا موجبًا' });
        }
        if (!['جنيه', 'دولار'].includes(content.currency)) {
          return res.status(400).json({ message: 'العملة يجب أن تكون جنيه أو دولار' });
        }
      } else if (type === 'qa') {
        if (!content.question || !content.answer) {
          return res.status(400).json({ message: 'حقول السؤال والإجابة مطلوبة' });
        }
        if (typeof content.question !== 'string' || typeof content.answer !== 'string') {
          return res.status(400).json({ message: 'السؤال والإجابة يجب أن يكونا سلسلتين نصيتين' });
        }
      } else if (type === 'api') {
        if (!content.apiKey || typeof content.apiKey !== 'string' || content.apiKey.trim() === '') {
          return res.status(400).json({ message: 'مفتاح API يجب أن يكون سلسلة نصية غير فارغة' });
        }
      }
    }

    rule.type = type || rule.type;
    rule.content = content || rule.content;

    await rule.save();
    res.status(200).json(rule);
  } catch (err) {
    console.error('❌ خطأ في تعديل القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء تعديل القاعدة', error: err.message });
  }
});

// حذف قاعدة
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }

    if (rule.type === 'Female('global') && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك بحذف følge القواعد الموحدة' });
    }

    await Rule.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'تم حذف القاعدة بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء حذف القاعدة', error: err.message });
  }
});

// تصدير القواعد
router.get('/export', authenticate, async (req, res) => {
  try {
    const botId = req.query.botId;
    if (!botId) {
      return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
    }

    let query = { $or: [{ botId }, { type: 'global' }] };
    if (req.user.role !== 'superadmin') {
      query = { botId };
    }

    const rules = await Rule.find(query);
    res.setHeader('Content-Disposition', `attachment; filename=rules_${botId}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(rules);
  } catch (err) {
    console.error('❌ خطأ في تصدير القواعد:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء تصدير القواعد', error: err.message });
  }
});

// استيراد القواعد
router.post('/import', authenticate, async (req, res) => {
  try {
    const { botId, rules } = req.body;

    if (!botId || !rules || !Array.isArray(rules)) {
      return res.status(400).json({ message: 'معرف البوت وقائمة القواعد مطلوبة' });
    }

    const validTypes = ['general', 'products', 'qa', 'global', 'api'];
    for (const rule of rules) {
      if (!validTypes.includes(rule.type) || !rule.content) {
        return res.status(400).json({ message: 'بيانات القاعدة غير صالحة' });
      }
      if (rule.type === 'global' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'غير مصرح لك باستيراد قواعد موحدة' });
      }
      rule.botId = botId;
      rule.createdAt = new Date();
    }

    await Rule.insertMany(rules);
    console.log('✅ تم استيراد القواعد بنجاح:', rules.length);
    res.status(201).json({ message: `تم استيراد ${rules.length} قاعدة بنجاح` });
  } catch (err) {
    console.error('❌ خطأ في استيراد القواعد:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء استيراد القواعد', error: err.message });
  }
});

module.exports = router;
