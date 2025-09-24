// /server/routes/categories.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// إنشاء قسم (مع auth)
router.post('/:storeId/categories', authenticate, categoryController.createCategory);

// تعديل قسم (مع auth)
router.put('/:storeId/categories/:categoryId', authenticate, categoryController.updateCategory);

// حذف قسم (مع auth)
router.delete('/:storeId/categories/:categoryId', authenticate, categoryController.deleteCategory);

// جلب الأقسام بـ storeId (مع auth)
router.get('/:storeId/categories', authenticate, categoryController.getCategories);

// جلب الأقسام بالـ storeLink (public، بدون auth)
router.get('/slug/:storeLink/categories', categoryController.getCategoriesByStoreLink);

module.exports = router;
