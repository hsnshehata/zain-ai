// /server/controllers/categoryController.js
const Category = require('../models/Category');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Bot = require('../models/Bot'); // استخدمنا للتحقق من مالك البوت
const logger = require('../logger');

// Helper: authorize user for store (throws or returns store)
async function getAuthorizedStore(storeId, userId, userRole) {
  const store = await Store.findById(storeId);
  if (!store) {
    const err = new Error('المتجر غير موجود');
    err.status = 404;
    throw err;
  }
  if (userRole === 'superadmin') return store;
  if (String(store.userId) === String(userId)) return store;
  if (store.botId) {
    const bot = await Bot.findById(store.botId);
    if (bot && String(bot.userId) === String(userId)) return store;
  }
  const err = new Error('غير مصرح لك');
  err.status = 403;
  throw err;
}

// إنشاء قسم جديد
exports.createCategory = async (req, res) => {
  const { storeId } = req.params;
  const { categoryName, categoryDescription } = req.body;
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    logger.info('category_create_attempt', { storeId, userId, categoryName });

    // authorize (throws on failure)
    let store;
    try {
      store = await getAuthorizedStore(storeId, userId, userRole);
    } catch (e) {
      logger.warn('category_create_auth_failed', { storeId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من الحقول المطلوبة
    if (!categoryName) {
      logger.warn('category_create_missing_name', { storeId });
      return res.status(400).json({ message: 'اسم القسم مطلوب' });
    }

    // التحقق من عدم وجود قسم بنفس الاسم في المتجر
    const existingCategory = await Category.findOne({ storeId, name: categoryName });
    if (existingCategory) {
      logger.warn('category_create_duplicate', { storeId, categoryName });
      return res.status(400).json({ message: 'اسم القسم موجود بالفعل' });
    }

    // إنشاء القسم
    const newCategory = new Category({
      storeId,
      name: categoryName,
      description: categoryDescription || ''
    });

    await newCategory.save();
    logger.info('category_created', { storeId, categoryId: newCategory._id, categoryName: newCategory.name });

    res.status(201).json(newCategory);
  } catch (err) {
    logger.error('category_create_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في إنشاء القسم: ' + (err.message || 'غير معروف') });
  }
};

// جلب كل الأقسام
exports.getCategories = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user ? req.user.userId : null;
  const userRole = req.user ? req.user.role : null;

  try {
    logger.info('categories_fetch_attempt', { storeId, userId: userId || 'public', role: userRole || 'public' });

    // for public requests (no auth) just verify store exists
    if (!userId) {
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ message: 'المتجر غير موجود' });
      }
      const categories = await Category.find({ storeId });
      return res.status(200).json(categories || []);
    }
    // authenticated: authorize
    let store;
    try {
      store = await getAuthorizedStore(storeId, userId, userRole);
    } catch (e) {
      logger.warn('categories_fetch_auth_failed', { storeId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    const categories = await Category.find({ storeId });
    logger.info('categories_fetch_success', { storeId, count: categories.length });
    res.status(200).json(categories || []);
  } catch (err) {
    logger.error('categories_fetch_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب الأقسام: ' + (err.message || 'غير معروف') });
  }
};

// تعديل قسم
exports.updateCategory = async (req, res) => {
  const { storeId, categoryId } = req.params;
  const { categoryName, categoryDescription } = req.body;
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    logger.info('category_update_attempt', { storeId, categoryId, userId, categoryName });

    // authorize
    let store;
    try {
      store = await getAuthorizedStore(storeId, userId, userRole);
    } catch (e) {
      logger.warn('category_update_auth_failed', { storeId, userId, categoryId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود القسم
    const category = await Category.findOne({ _id: categoryId, storeId });
    if (!category) {
      logger.warn('category_update_not_found', { storeId, categoryId });
      return res.status(404).json({ message: 'القسم غير موجود' });
    }

    // التحقق من الحقول المطلوبة
    if (!categoryName) {
      logger.warn('category_update_missing_name', { storeId, categoryId });
      return res.status(400).json({ message: 'اسم القسم مطلوب' });
    }

    // التحقق من عدم وجود قسم آخر بنفس الاسم
    const existingCategory = await Category.findOne({ storeId, name: categoryName, _id: { $ne: categoryId } });
    if (existingCategory) {
      logger.warn('category_update_duplicate', { storeId, categoryId, categoryName });
      return res.status(400).json({ message: 'اسم القسم موجود بالفعل' });
    }

    // تحديث القسم
    category.name = categoryName;
    category.description = categoryDescription || '';
    await category.save();

    logger.info('category_updated', { storeId, categoryId: category._id, categoryName: category.name });
    res.status(200).json(category);
  } catch (err) {
    logger.error('category_update_error', { storeId, categoryId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في تعديل القسم: ' + (err.message || 'غير معروف') });
  }
};

// حذف قسم
exports.deleteCategory = async (req, res) => {
  const { storeId, categoryId } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    logger.info('category_delete_attempt', { storeId, categoryId, userId });
    // authorize
    let store;
    try {
      store = await getAuthorizedStore(storeId, userId, userRole);
    } catch (e) {
      logger.warn('category_delete_auth_failed', { storeId, categoryId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود القسم
    const category = await Category.findOne({ _id: categoryId, storeId });
    if (!category) {
      logger.warn('category_delete_not_found', { storeId, categoryId });
      return res.status(404).json({ message: 'القسم غير موجود' });
    }

    // التحقق من وجود منتجات مرتبطة بالقسم
    const products = await Product.find({ storeId, category: categoryId });
    if (products.length > 0) {
      logger.warn('category_delete_has_products', { storeId, categoryId, productsCount: products.length });
      return res.status(400).json({ message: 'لا يمكن حذف القسم لأنه يحتوي على منتجات' });
    }

    await category.deleteOne();
    logger.info('category_deleted', { storeId, categoryId: category._id, categoryName: category.name });

    res.status(200).json({ message: 'تم حذف القسم بنجاح' });
  } catch (err) {
    logger.error('category_delete_error', { storeId, categoryId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في حذف القسم: ' + (err.message || 'غير معروف') });
  }
};

// جلب قسم واحد
exports.getCategory = async (req, res) => {
  const { storeId, categoryId } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    logger.info('category_fetch_attempt', { storeId, categoryId, userId });
    // authorize
    let store;
    try {
      store = await getAuthorizedStore(storeId, userId, userRole);
    } catch (e) {
      logger.warn('category_fetch_auth_failed', { storeId, categoryId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود القسم
    const category = await Category.findOne({ _id: categoryId, storeId });
    if (!category) {
      logger.warn('category_fetch_not_found', { storeId, categoryId });
      return res.status(404).json({ message: 'القسم غير موجود' });
    }

    logger.info('category_fetch_success', { storeId, categoryId: category._id, categoryName: category.name });
    res.status(200).json(category);
  } catch (err) {
    logger.error('category_fetch_error', { storeId, categoryId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب القسم: ' + (err.message || 'غير معروف') });
  }
};
