// /server/controllers/rulesController.js

const mongoose = require('mongoose');
const Rule = require('../models/Rule');
const Conversation = require('../models/Conversation');
const Bot = require('../models/Bot');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// جلب كل القواعد مع دعم الفلترة والبحث والـ pagination
exports.getRules = async (req, res) => {
  try {
    const botId = req.query.botId;
    const type = req.query.type; // نوع القاعدة (اختياري)
    const search = req.query.search; // كلمة البحث (اختياري)
    const page = parseInt(req.query.page) || 1; // رقم الصفحة
    const limit = parseInt(req.query.limit) || 30; // عدد القواعد لكل صفحة

    // التحقق من وجود botId
    if (!botId && type !== 'global') {
      return res.status(400).json({ message: 'معرف البوت (botId) مطلوب للقواعد غير الموحدة' });
    }

    // التحقق من إن botId هو ObjectId صالح لو موجود
    if (botId && !mongoose.Types.ObjectId.isValid(botId)) {
      return res.status(400).json({ message: 'معرف البوت (botId) غير صالح' });
    }

    let query = {};
    if (req.user.role === 'superadmin') {
      // السوبر أدمن يشوف القواعد بناءً على الطلب
      if (botId) {
        // التحقق من إن botId موجود في جدول Bot
        const botExists = await Bot.findById(botId);
        if (!botExists) {
          return res.status(404).json({ message: 'البوت غير موجود' });
        }
        query = { botId }; // جلب قواعد البوت فقط (مش القواعد الموحدة)
      } else {
        query = { type: 'global' }; // لو مفيش botId، يجيب القواعد الموحدة بس
      }
    } else {
      // المستخدم العادي يشوف قواعده بس (مش الموحدة)
      if (!botId) {
        return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
      }
      // التحقق من إن botId موجود في جدول Bot
      const botExists = await Bot.findById(botId);
      if (!botExists) {
        return res.status(404).json({ message: 'البوت غير موجود' });
      }
      query = { botId, type: { $ne: 'global' } };
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
        { 'content.platform': { $regex: search, $options: 'i' } },
        { 'content.description': { $regex: search, $options: 'i' } },
        { 'content.value': { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const totalRules = await Rule.countDocuments(query);
    const rules = await Rule.find(query)
      .sort({ createdAt: -1 }) // ترتيب تنازلي حسب تاريخ الإنشاء
      .skip((page - 1) * limit)
      .limit(limit);

    console.log(`[${getTimestamp()}] ✅ تم جلب القواعد بنجاح | User: ${req.user.userId} | Bot: ${botId || 'N/A'} | Rules Count: ${rules.length}`, rules);
    res.status(200).json({
      rules,
      totalPages: Math.ceil(totalRules / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب القواعد | User: ${req.user?.userId || 'N/A'} | Bot: ${req.query.botId || 'N/A'}`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء جلب القواعد', error: err.message });
  }
};

// إنشاء قاعدة جديدة
exports.createRule = async (req, res) => {
  const { botId, type, content } = req.body;

  // التحقق من الحقول الأساسية
  if (!type || !content) {
    return res.status(400).json({ message: 'الحقلين type و content مطلوبين' });
  }

  // تحقق إضافي: التأكد إن content مش فاضي أو null
  if (content === null || (typeof content === 'string' && content.trim() === '')) {
    return res.status(400).json({ message: 'المحتوى لا يمكن أن يكون فارغًا' });
  }
  if (typeof content === 'object' && Object.keys(content).length === 0) {
    return res.status(400).json({ message: 'المحتوى لا يمكن أن يكون كائنًا فارغًا' });
  }

  // التحقق من botId فقط إذا كان النوع مش global
  if (type !== 'global' && !botId) {
    return res.status(400).json({ message: 'معرف البوت (botId) مطلوب للقواعد غير الموحدة' });
  }

  // التحقق من إن botId هو ObjectId صالح لو موجود
  if (botId && !mongoose.Types.ObjectId.isValid(botId)) {
    return res.status(400).json({ message: 'معرف البوت (botId) غير صالح' });
  }

  // التحقق من صلاحيات السوبر أدمن للقواعد الموحدة
  if (type === 'global' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بإنشاء قواعد موحدة' });
  }

  // التحقق من نوع القاعدة
  const validTypes = ['general', 'products', 'qa', 'global', 'channels'];
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
  } else if (type === 'channels') {
    if (!content.platform || !content.description || !content.value) {
      return res.status(400).json({ message: 'حقول المنصة والوصف والرابط/الرقم مطلوبة' });
    }
    if (typeof content.platform !== 'string' || typeof content.description !== 'string' || typeof content.value !== 'string') {
      return res.status(400).json({ message: 'المنصة والوصف والرابط/الرقم يجب أن يكونوا سلاسل نصية' });
    }
  }

  try {
    console.log(`[${getTimestamp()}] 📥 البيانات المرسلة إلى MongoDB | User: ${req.user.userId} | Bot: ${botId || 'N/A'}`, { botId, type, content });
    const rule = new Rule({ botId: type !== 'global' ? botId : undefined, type, content });
    await rule.save();
    console.log(`[${getTimestamp()}] ✅ تم حفظ القاعدة بنجاح | User: ${req.user.userId} | Bot: ${botId || 'N/A'} | Rule ID: ${rule._id}`, rule);
    res.status(201).json(rule);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في إنشاء القاعدة | User: ${req.user.userId} | Bot: ${botId || 'N/A'}`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء إنشاء القاعدة', error: err.message });
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

    if (rule.type === 'global' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك بتعديل القواعد الموحدة' });
    }

    // تحقق إضافي: التأكد إن content مش فاضي أو null لو تم إرساله
    if (content) {
      if (content === null || (typeof content === 'string' && content.trim() === '')) {
        return res.status(400).json({ message: 'المحتوى لا يمكن أن يكون فارغًا' });
      }
      if (typeof content === 'object' && Object.keys(content).length === 0) {
        return res.status(400).json({ message: 'المحتوى لا يمكن أن يكون كائنًا فارغًا' });
      }
    }

    // التحقق من نوع القاعدة إذا تم إرساله
    if (type) {
      const validTypes = ['general', 'products', 'qa', 'global', 'channels'];
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
      } else if (type === 'channels') {
        if (!content.platform || !content.description || !content.value) {
          return res.status(400).json({ message: 'حقول المنصة والوصف والرابط/الرقم مطلوبة' });
        }
        if (typeof content.platform !== 'string' || typeof content.description !== 'string' || typeof content.value !== 'string') {
          return res.status(400).json({ message: 'المنصة والوصف والرابط/الرقم يجب أن يكونوا سلاسل نصية' });
        }
      }
    }

    rule.type = type || rule.type;
    rule.content = content || rule.content;

    await rule.save();
    console.log(`[${getTimestamp()}] ✅ تم تعديل القاعدة بنجاح | User: ${req.user.userId} | Rule ID: ${rule._id} | Bot: ${rule.botId || 'N/A'}`, rule);
    res.status(200).json(rule);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تعديل القاعدة | User: ${req.user?.userId || 'N/A'} | Rule ID: ${req.params.id}`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء تعديل القاعدة', error: err.message });
  }
};

// حذف قاعدة
exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }

    if (rule.type === 'global' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك بحذف القواعد الموحدة' });
    }

    await Rule.deleteOne({ _id: req.params.id });
    console.log(`[${getTimestamp()}] ✅ تم حذف القاعدة بنجاح | User: ${req.user.userId} | Rule ID: ${req.params.id} | Bot: ${rule.botId || 'N/A'}`);
    res.status(200).json({ message: 'تم حذف القاعدة بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في حذف القاعدة | User: ${req.user?.userId || 'N/A'} | Rule ID: ${req.params.id}`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء حذف القاعدة', error: err.message });
  }
};

// تصدير القواعد كـ JSON
exports.exportRules = async (req, res) => {
  try {
    const botId = req.query.botId;

    let query = {};
    if (req.user.role === 'superadmin') {
      // السوبر أدمن يقدر يصدر القواعد الموحدة أو قواعد بوت معين
      if (botId) {
        // التحقق من إن botId صالح
        if (!mongoose.Types.ObjectId.isValid(botId)) {
          return res.status(400).json({ message: 'معرف البوت (botId) غير صالح' });
        }

        // التحقق من إن botId موجود في جدول Bot
        const botExists = await Bot.findById(botId);
        if (!botExists) {
          return res.status(404).json({ message: 'البوت غير موجود' });
        }

        // السوبر أدمن يقدر يصدر قواعد البوت فقط (مش القواعد الموحدة)
        query = { botId };
      } else {
        // لو مفيش botId، يصدر القواعد الموحدة بس
        query = { type: 'global' };
      }
    } else {
      // المستخدم العادي يصدر قواعده بس (مش القواعد الموحدة)
      if (!botId) {
        return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
      }
      if (!mongoose.Types.ObjectId.isValid(botId)) {
        return res.status(400).json({ message: 'معرف البوت (botId) غير صالح' });
      }

      // التحقق من إن botId موجود في جدول Bot
      const botExists = await Bot.findById(botId);
      if (!botExists) {
        return res.status(404).json({ message: 'البوت غير موجود' });
      }

      query = { botId, type: { $ne: 'global' } };
    }

    const rules = await Rule.find(query);
    console.log(`[${getTimestamp()}] ✅ تم تصدير القواعد بنجاح | User: ${req.user.userId} | Bot: ${botId || 'N/A'} | Rules Exported: ${rules.length}`);
    res.setHeader('Content-Disposition', `attachment; filename=rules_${botId || 'global'}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(rules);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تصدير القواعد | User: ${req.user?.userId || 'N/A'} | Bot: ${req.query.botId || 'N/A'}`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء تصدير القواعد', error: err.message });
  }
};

// استيراد القواعد من ملف JSON
exports.importRules = async (req, res) => {
  try {
    const botId = req.body.botId;
    const rules = req.body.rules;

    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({ message: 'قائمة القواعد مطلوبة ويجب أن تكون مصفوفة' });
    }

    // التحقق من botId لو موجود (للقواعد غير الموحدة)
    if (botId && !mongoose.Types.ObjectId.isValid(botId)) {
      return res.status(400).json({ message: 'معرف البوت (botId) غير صالح' });
    }

    const validTypes = ['general', 'products', 'qa', 'global', 'channels'];
    for (const rule of rules) {
      if (!validTypes.includes(rule.type) || !rule.content) {
        return res.status(400).json({ message: 'بيانات القاعدة غير صالحة' });
      }
      if (rule.type === 'global' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'غير مصرح لك باستيراد قواعد موحدة' });
      }
      if (rule.type !== 'global' && !botId) {
        return res.status(400).json({ message: 'معرف البوت (botId) مطلوب للقواعد غير الموحدة' });
      }
      rule.botId = rule.type !== 'global' ? botId : undefined; // ما نضيفش botId للقواعد الموحدة
      rule.createdAt = new Date(); // تحديث تاريخ الإنشاء
    }

    await Rule.insertMany(rules);
    console.log(`[${getTimestamp()}] ✅ تم استيراد القواعد بنجاح | User: ${req.user.userId} | Bot: ${botId || 'N/A'} | Rules Imported: ${rules.length}`);
    res.status(201).json({ message: `تم استيراد ${rules.length} قاعدة بنجاح` });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في استيراد القواعد | User: ${req.user?.userId || 'N/A'} | Bot: ${req.body.botId || 'N/A'}`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء استيراد القواعد', error: err.message });
  }
};
