// /server/controllers/categoryController.js
const Category = require('../models/Category');
const Store = require('../models/Product');
const Store = require('../models/Store');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إنشاء قسم جديد
exports.createCategory = async (req, res) => {
  const { storeId } = req.params;
  const { categoryName, categoryDescription } = req.body;
  const userId = req.user.userId;

  try {
    console.log(`[${getTimestamp()}] 📡 Creating category for store ${storeId} with data:`, {
      categoryName,
      categoryDescription
    });

    // التحقق من وجود المتجر وملكيته
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Create category failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من الحقول المطلوبة
    if (!categoryName) {
      console.log(`[${getTimestamp()}] ❌ Create category failed: Missing categoryName`);
      return res.status(400).json({ message: 'اسم القسم مطلوب' });
    }

    // التحقق من عدم وجود قسم بنفس الاسم في المتجر
    const existingCategory = await Category.findOne({ storeId, name: categoryName });
    if (existingCategory) {
      console.log(`[${getTimestamp()}] ❌ Create category failed: Category ${categoryName} already exists in store ${storeId}`);
      return res.status(400).json({ message: 'اسم القسم موجود بالفعل' });
    }

    // إنشاء القسم
    const newCategory = new Category({
      storeId,
      name: categoryName,
      description: categoryDescription || ''
    });

    await newCategory.save();
    console.log(`[${getTimestamp()}] ✅ Category created: ${newCategory.name} for store ${storeId}`);

    res.status(201).json(newCategory);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating category:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في إنشاء القسم: ' + (err.message || 'غير معروف') });
  }
};

// جلب كل الأقسام
exports.getCategories = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId;

  try {
    console.log(`[${getTimestamp()}] 📡 Attempting to fetch categories for store ${storeId} and user ${userId}`);

    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get categories failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    const categories = await Category.find({ storeId });
    console.log(`[${getTimestamp()}] ✅ Fetched ${categories.length} categories for store ${storeId}`);

    res.status(200).json(categories || []);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching categories for store ${storeId}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب الأقسام: ' + (err.message || 'غير معروف') });
  }
};

// حذف قسم
exports.deleteCategory = async (req, res) => {
  const { storeId, categoryId } = req.params;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Delete category failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من وجود القسم
    const category = await Category.findOne({ _id: categoryId, storeId });
    if (!category) {
      console.log(`[${getTimestamp()}] ❌ Delete category failed: Category ${categoryId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'القسم غير موجود' });
    }

    // التحقق من وجود منتجات مرتبطة بالقسم
    const products = await Product.find({ storeId, category: categoryId });
    if (products.length > 0) {
      console.log(`[${getTimestamp()}] ❌ Delete category failed: Category ${categoryId} has ${products.length} products`);
      return res.status(400).json({ message: 'لا يمكن حذف القسم لأنه يحتوي على منتجات' });
    }

    await category.deleteOne();
    console.log(`[${getTimestamp()}] ✅ Category deleted: ${category.name} from store ${storeId}`);

    res.status(200).json({ message: 'تم حذف القسم بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error deleting category:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في حذف القسم: ' + (err.message || 'غير معروف') });
  }
};
