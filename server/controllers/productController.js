// /server/controllers/productController.js
const Product = require('../models/Product');
const Store = require('../models/Store');
const Category = require('../models/Category');
const { uploadToImgbb } = require('./uploadController');
const axios = require('axios');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إنشاء منتج جديد
exports.createProduct = async (req, res) => {
  const { storeId } = req.params;
  const { productName, description, price, hasOffer, originalPrice, discountedPrice, currency, stock, lowStockThreshold, category } = req.body;
  const userId = req.user.userId;
  const file = req.file;

  try {
    console.log(`[${getTimestamp()}] 📡 Creating product for store ${storeId} with data:`, {
      productName,
      description,
      price,
      hasOffer,
      originalPrice,
      discountedPrice,
      currency,
      stock,
      lowStockThreshold,
      category,
      hasFile: !!file,
      file: file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : null
    });

    // التحقق من وجود المتجر وملكيته
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Create product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // التحقق من الحقول المطلوبة
    if (!productName || !price || !currency || stock === undefined) {
      console.log(`[${getTimestamp()}] ❌ Create product failed: Missing required fields`, {
        productName,
        price,
        currency,
        stock
      });
      return res.status(400).json({ message: 'اسم المنتج، السعر، العملة، والمخزون مطلوبة' });
    }

    // التحقق من حقول العرض
    const offerEnabled = hasOffer === "yes" || hasOffer === true;
    if (offerEnabled && (!originalPrice || !discountedPrice)) {
      console.log(`[${getTimestamp()}] ❌ Create product failed: Missing offer fields`, { originalPrice, discountedPrice });
      return res.status(400).json({ message: 'السعر قبل وبعد الخصم مطلوبان إذا كان هناك عرض' });
    }

    // التحقق من وجود القسم لو تم اختياره
    let categoryId = null;
    if (category) {
      const categoryExists = await Category.findOne({ _id: category, storeId });
      if (!categoryExists) {
        console.log(`[${getTimestamp()}] ❌ Create product failed: Category ${category} not found for store ${storeId}`);
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
      categoryId = category;
    }

    // رفع الصورة إذا وجدت
    let imageUrl = '';
    if (file) {
      try {
        imageUrl = await uploadToImgbb(file);
        console.log(`[${getTimestamp()}] ✅ Image uploaded for product: ${imageUrl}`);
      } catch (err) {
        console.log(`[${getTimestamp()}] ❌ Failed to upload image:`, err.message);
        return res.status(500).json({ message: 'فشل في رفع الصورة: ' + (err.message || 'غير معروف') });
      }
    }

    const newProduct = new Product({
      storeId,
      productName,
      description: description || '',
      price,
      hasOffer: offerEnabled,
      originalPrice: offerEnabled ? originalPrice : null,
      discountedPrice: offerEnabled ? discountedPrice : null,
      currency,
      stock,
      lowStockThreshold: lowStockThreshold || 10,
      category: categoryId,
      imageUrl,
      isActive: true
    });

    await newProduct.save();
    console.log(`[${getTimestamp()}] ✅ Product created: ${newProduct.productName} for store ${storeId}, imageUrl: ${newProduct.imageUrl}`);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في إنشاء المنتج: ' + (err.message || 'غير معروف') });
  }
};

// تعديل منتج
exports.updateProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const { productName, description, price, hasOffer, originalPrice, discountedPrice, currency, stock, lowStockThreshold, category } = req.body;
  const userId = req.user.userId;
  const file = req.file;

  try {
    console.log(`[${getTimestamp()}] 📡 Updating product ${productId} for store ${storeId} with data:`, {
      productName,
      description,
      price,
      hasOffer,
      originalPrice,
      discountedPrice,
      currency,
      stock,
      lowStockThreshold,
      category,
      hasFile: !!file,
      file: file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : null
    });

    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Update product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Update product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // تحديث الحقول
    if (productName) product.productName = productName;
    if (description !== undefined) product.description = description;
    if (price) product.price = price;
    if (currency) product.currency = currency;
    if (stock !== undefined) product.stock = stock;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;

    const offerEnabled = hasOffer === "yes" || hasOffer === true;
    product.hasOffer = offerEnabled;
    if (offerEnabled) {
      if (!originalPrice || !discountedPrice) {
        console.log(`[${getTimestamp()}] ❌ Update product failed: Missing offer fields`, { originalPrice, discountedPrice });
        return res.status(400).json({ message: 'السعر قبل وبعد الخصم مطلوبان إذا كان هناك عرض' });
      }
      product.originalPrice = originalPrice;
      product.discountedPrice = discountedPrice;
    } else {
      product.originalPrice = null;
      product.discountedPrice = null;
    }

    // تحديث القسم
    if (category) {
      const categoryExists = await Category.findOne({ _id: category, storeId });
      if (!categoryExists) {
        console.log(`[${getTimestamp()}] ❌ Update product failed: Category ${category} not found for store ${storeId}`);
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
      product.category = category;
    } else {
      product.category = null;
    }

    // رفع صورة جديدة إذا وجدت
    if (file) {
      try {
        product.imageUrl = await uploadToImgbb(file);
        console.log(`[${getTimestamp()}] ✅ Image updated for product: ${product.imageUrl}`);
      } catch (err) {
        console.log(`[${getTimestamp()}] ❌ Failed to upload image:`, err.message);
        return res.status(500).json({ message: 'فشل في رفع الصورة: ' + (err.message || 'غير معروف') });
      }
    }

    await product.save();
    console.log(`[${getTimestamp()}] ✅ Product updated: ${product.productName} for store ${storeId}, imageUrl: ${product.imageUrl}`);

    res.status(200).json(product);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updating product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في تعديل المنتج: ' + (err.message || 'غير معروف') });
  }
};

// حذف منتج
exports.deleteProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user.userId;

  try {
    console.log(`[${getTimestamp()}] 📡 Deleting product ${productId} for store ${storeId}, user ${userId}`);

    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    await Product.deleteOne({ _id: productId });
    console.log(`[${getTimestamp()}] ✅ Product deleted: ${product.productName} from store ${storeId}`);

    res.status(200).json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error deleting product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في حذف المنتج: ' + (err.message || 'غير معروف') });
  }
};

// جلب المنتجات بـ storeId (لصاحب المتجر)
exports.getProducts = async (req, res) => {
  const { storeId } = req.params;
  const { category } = req.query;
  const userId = req.user.userId;

  try {
    console.log(`[${getTimestamp()}] 📡 Attempting to fetch products for store ${storeId} and user ${userId}`, { category });

    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get products failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // جلب المنتجات حسب القسم إذا تم تحديده
    const query = { storeId };
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query).populate('category');
    console.log(`[${getTimestamp()}] ✅ Fetched ${products.length} products for store ${storeId}`);

    res.status(200).json(products || []);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching products for store ${storeId}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتجات: ' + (err.message || 'غير معروف') });
  }
};

// جلب المنتجات بالـ storeLink (public)
exports.getProductsByStoreLink = async (req, res) => {
  const { storeLink } = req.params;
  const { category } = req.query;

  try {
    console.log(`[${getTimestamp()}] 📡 Attempting to fetch products for storeLink ${storeLink}`, { category });

    // التحقق من وجود المتجر
    const store = await Store.findOne({ storeLink });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get products failed: Store link ${storeLink} not found`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // جلب المنتجات حسب القسم إذا تم تحديده
    const query = { storeId: store._id };
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query).populate('category');
    console.log(`[${getTimestamp()}] ✅ Fetched ${products.length} products for storeLink ${storeLink}`);

    res.status(200).json(products || []);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching products for storeLink ${storeLink}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتجات: ' + (err.message || 'غير معروف') });
  }
};

// جلب منتج واحد
exports.getProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user.userId;

  try {
    console.log(`[${getTimestamp()}] 📡 Fetching product ${productId} for store ${storeId}, user ${userId}`);
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId }).populate('category');
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Get product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    console.log(`[${getTimestamp()}] ✅ Fetched product: ${product.productName} for store ${storeId}, imageUrl: ${product.imageUrl}`);
    res.status(200).json(product);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتج: ' + (err.message || 'غير معروف') });
  }
};
