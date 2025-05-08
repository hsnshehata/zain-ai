// /server/routes/rules.js

const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const authenticate = require('../middleware/authenticate');
const rulesController = require('../controllers/rulesController');

// تصدير القواعد (هنحطه أول route عشان يشتغل قبل /:id)
router.get('/export', authenticate, rulesController.exportRules);

// استيراد القواعد (هنحطه قبل /:id برضو)
router.post('/import', authenticate, rulesController.importRules);

// جلب كل القواعد مع دعم الفلترة والبحث والـ pagination
router.get('/', authenticate, rulesController.getRules);

// جلب قاعدة محددة (هنحطه بعد الـ routes الثابتة)
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
router.post('/', authenticate, rulesController.createRule);

// تعديل قاعدة
router.put('/:id', authenticate, rulesController.updateRule);

// حذف قاعدة
router.delete('/:id', authenticate, rulesController.deleteRule);

module.exports = router;
