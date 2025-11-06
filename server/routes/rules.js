// /server/routes/rules.js

const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const authenticate = require('../middleware/authenticate');
const rulesController = require('../controllers/rulesController');

// Middleware للتحقق من صلاحيات السوبر أدمن
const restrictToSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك بهذه العملية، يتطلب صلاحيات سوبر أدمن' });
  }
  next();
};

// تصدير القواعد
router.get('/export', authenticate, rulesController.exportRules);

// استيراد القواعد
router.post('/import', authenticate, rulesController.importRules);

// جلب كل القواعد مع دعم الفلترة والبحث والـ pagination
router.get('/', authenticate, rulesController.getRules);

// جلب قاعدة محددة
router.get('/:id', authenticate, async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'القاعدة غير موجودة' });
    }
    // التحقق إن المستخدم العادي ما يشوفش القواعد الموحدة
    if (rule.type === 'global' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك برؤية هذه القاعدة الموحدة' });
    }
    res.status(200).json(rule);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ خطأ في جلب القاعدة | User: ${req.user?.userId || 'N/A'} | Rule ID: ${req.params.id}`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء جلب القاعدة', error: err.message });
  }
});

// إنشاء قاعدة جديدة
router.post('/', authenticate, rulesController.createRule);

// تعديل قاعدة
router.put('/:id', authenticate, rulesController.updateRule);

// حذف قاعدة
router.delete('/:id', authenticate, rulesController.deleteRule);

module.exports = router;
