const Rule = require('../models/Rule');

// جلب كل القواعد
exports.getRules = async (req, res) => {
  try {
    const botId = req.query.botId;
    if (!botId) {
      return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
    }

    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    console.log('✅ تم جلب القواعد بنجاح:', rules);
    res.status(200).json(rules);
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
