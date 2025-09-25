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

// جلب كل الأقسام (بدون authenticate للوصول العام)
router.get('/:storeId/categories', categoryController.getCategories);

// حذف قسم
router.delete('/:storeId/categories/:categoryId', authenticate, categoryController.deleteCategory);

module.exports = router;
