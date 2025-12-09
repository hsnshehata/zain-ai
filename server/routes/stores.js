// /server/routes/stores.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const storeController = require('../controllers/storeController');
const Store = require('../models/Store');

const router = express.Router();

const normalizeStoreLink = (value = '') => {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
};

// إنشاء متجر
router.post('/', authenticate, storeController.createStore);

// تعديل متجر
router.put('/:storeId', authenticate, storeController.updateStore);

// جلب متجر بالـ ObjectId (للمالك)
router.get('/:storeId', authenticate, storeController.getStore);

// جلب متجر بالـ storeLink (للزبائن العاديين، بدون authenticate)
router.get('/store/:storeLink', storeController.getStoreByLink);

// التحقق من توفر رابط مخصص
router.get('/check-link/:link', async (req, res) => {
  try {
    const { link } = req.params;
    const normalizedLink = normalizeStoreLink(link);

    if (!normalizedLink || normalizedLink.length < 4) {
      return res.status(400).json({
        available: false,
        normalizedLink,
        message: 'الرابط يجب أن يكون باللغة الإنجليزية وبحد أدنى 4 أحرف'
      });
    }

    const existing = await Store.findOne({ storeLink: normalizedLink });
    res.json({ available: !existing, normalizedLink });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
