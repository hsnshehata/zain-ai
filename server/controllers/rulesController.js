const Rule = require('../models/Rule');

// جلب كل القواعد مع دعم الفلترة والبحث والـ pagination
exports.getRules = async (req, res) => {
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

    console.log('✅ تم جلب القواعد بنجاح:', rules);
    res.status(200).json({
      rules,
      totalPages: Math.ceil(totalRules / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error('❌ خطأ في جلب القواعد:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إنشاء قاعدة جديدة
exports.createRule = async (req, res) => {
  const { botId, type, content } = req.body;

  if (!botId || !type || !content) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }

  const validTypes = ['general', 'products', 'qa', 'global', 'api'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'نوع القاعدة غير صالح' });
  }

  try {
    console.log('📥 إنشاء قاعدة جديدة:', { botId, type, content });
    const rule = new Rule({ botId, type, content });
    await rule.save();
    console.log('✅ تم إنشاء القاعدة بنجاح:', rule);
    res.status(201).json(rule);
  } catch (err) {
    console.error('❌ خطأ في إنشاء القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعديل قاعدة
exports.updateRule = async (req, res) => {
  const { type, content } = req.body;

  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }

    if (type) {
      const validTypes = ['general', 'products', 'qa', 'global', 'api'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'نوع القاعدة غير صالح' });
      }
    }

    console.log('📥 تعديل قاعدة:', { id: req.params.id, type, content });
    rule.type = type || rule.type;
    rule.content = content || rule.content;

    await rule.save();
    console.log('✅ تم تعديل القاعدة بنجاح:', rule);
    res.status(200).json(rule);
  } catch (err) {
    console.error('❌ خطأ في تعديل القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// حذف قاعدة
exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }

    console.log('📥 حذف قاعدة:', { id: req.params.id });
    await Rule.deleteOne({ _id: req.params.id });
    console.log('✅ تم حذف القاعدة بنجاح');
    res.status(200).json({ message: 'تم حذف القاعدة بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف القاعدة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تصدير القواعد كـ JSON
exports.exportRules = async (req, res) => {
  try {
    const botId = req.query.botId;
    if (!botId) {
      return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
    }

    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    res.setHeader('Content-Disposition', `attachment; filename=rules_${botId}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(rules);
  } catch (err) {
    console.error('❌ خطأ في تصدير القواعد:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// استيراد القواعد من ملف JSON
exports.importRules = async (req, res) => {
  try {
    const botId = req.body.botId;
    const rules = req.body.rules;

    if (!botId || !rules || !Array.isArray(rules)) {
      return res.status(400).json({ message: 'معرف البوت وقائمة القواعد مطلوبة' });
    }

    const validTypes = ['general', 'products', 'qa', 'global', 'api'];
    for (const rule of rules) {
      if (!validTypes.includes(rule.type) || !rule.content) {
        return res.status(400).json({ message: 'بيانات القاعدة غير صالحة' });
      }
      rule.botId = botId; // التأكد من ربط القاعدة بالـ botId
      rule.createdAt = new Date(); // تحديث تاريخ الإنشاء
    }

    await Rule.insertMany(rules);
    console.log('✅ تم استيراد القواعد بنجاح:', rules.length);
    res.status(201).json({ message: `تم استيراد ${rules.length} قاعدة بنجاح` });
  } catch (err) {
    console.error('❌ خطأ في استيراد القواعد:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
