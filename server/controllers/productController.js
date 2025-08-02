// /server/controllers/productController.js
const Product = require('../models/Product');
const Store = require('../models/Store');
const Rule = require('../models/Rule');
const { uploadToImgbb } = require('./uploadController');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إضافة منتج جديد
exports.createProduct = async (req, res) => {
  const { storeId } = req.params;
  const { productName, description, price, currency, stock, lowStockThreshold, category } = req.body;
  const userId = req.user.userId;
  const file = req.file; // الصورة لو موجودة

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Create product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // رفع الصورة لو موجودة
    let imageUrl = '';
    if (file) {
      const uploadResult = await uploadToImgbb(file);
      imageUrl = uploadResult.url;
      console.log(`[${getTimestamp()}] ✅ Product image uploaded: ${imageUrl}`);
    }

    // إنشاء المنتج
    const newProduct = new Product({
      storeId,
      productName,
      description: description || '',
      price,
      currency: currency || 'EGP',
      imageUrl,
      stock: stock || 0,
      lowStockThreshold: lowStockThreshold || 10,
      category: category || ''
    });

    await newProduct.save();
    console.log(`[${getTimestamp()}] ✅ Product created: ${newProduct.productName} for store ${storeId}`);

    // إنشاء قاعدة للبوت بناءً على المنتج
    const productRule = new Rule({
      storeId,
      type: 'store',
      content: {
        productName: newProduct.productName,
        price: newProduct.price,
        currency: newProduct.currency,
        description: newProduct.description,
        imageUrl: newProduct.imageUrl,
        stock: newProduct.stock
      }
    });
    await productRule.save();
    console.log(`[${getTimestamp()}] ✅ Created store rule for product ${newProduct._id}`);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في إنشاء المنتج' });
  }
};

// تعديل منتج
exports.updateProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const { productName, description, price, currency, stock, lowStockThreshold, category } = req.body;
  const userId = req.user.userId;
  const file = req.file; // الصورة لو اتغيرت

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Update product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Update product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // تحديث الصورة لو موجودة
    if (file) {
      const uploadResult = await uploadToImgbb(file);
      product.imageUrl = uploadResult.url;
      console.log(`[${getTimestamp()}] ✅ Product image updated: ${product.imageUrl}`);
    }

    // تحديث الحقول
    if (productName) product.productName = productName;
    if (description !== undefined) product.description = description;
    if (price) product.price = price;
    if (currency) product.currency = currency;
    if (stock !== undefined) product.stock = stock;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
    if (category !== undefined) product.category = category;

    await product.save();
    console.log(`[${getTimestamp()}] ✅ Product updated: ${product.productName} for store ${storeId}`);

    // تحديث قاعدة البوت
    await Rule.findOneAndUpdate(
      { storeId, type: 'store', 'content.productName': product.productName },
      {
        $set: {
          content: {
            productName: product.productName,
            price: product.price,
            currency: product.currency,
            description: product.description,
            imageUrl: product.imageUrl,
            stock: product.stock
          }
        }
      },
      { upsert: true }
    );
    console.log(`[${getTimestamp()}] ✅ Updated store rule for product ${product._id}`);

    res.status(200).json(product);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updating product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في تعديل المنتج' });
  }
};

// حذف منتج
exports.deleteProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // حذف المنتج
    const product = await Product.findOneAndDelete({ _id: productId, storeId });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // حذف قاعدة البوت المرتبطة
    await Rule.deleteOne({ storeId, type: 'store', 'content.productName': product.productName });
    console.log(`[${getTimestamp()}] ✅ Product deleted: ${product.productName} from store ${storeId}`);

    res.status(200).json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error deleting product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في حذف المنتج' });
  }
};

// جلب المنتجات
exports.getProducts = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get products failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    const products = await Product.find({ storeId }).sort({ createdAt: -1 });
    console.log(`[${getTimestamp()}] ✅ Fetched ${products.length} products for store ${storeId}`);
    res.status(200).json(products);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching products:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتجات' });
  }
};
