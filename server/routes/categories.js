// /server/routes/categories.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const categoryController = require('../controllers/categoryController');

// Middleware لتسجيل الطلبات
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📡 Category Route: ${req.method} ${req.url}`);
  next();
});

// إضافة قسم جديد
router.post('/:storeId/categories', authenticate, categoryController.createCategory);

// جلب كل الأقسام (مع authenticate للداشبورد، بدون للمتجر)
router.get('/:storeId/categories', (req, res, next) => {
  if (req.headers.authorization) {
    authenticate(req, res, next);
  } else {
    next();
  }
}, categoryController.getCategories);

// جلب قسم معين
router.get('/:storeId/categories/:categoryId', authenticate, categoryController.getCategory);

// تعديل قسم
router.put('/:storeId/categories/:categoryId', authenticate, categoryController.updateCategory);

// حذف قسم
router.delete('/:storeId/categories/:categoryId', authenticate, categoryController.deleteCategory);

module.exports = router;
