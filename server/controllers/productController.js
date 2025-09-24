// /server/controllers/productController.js
const Product = require('..//models/Product');
const Store = require('..//models/Store');
const Category = require('..//models/Category');
const { uploadToImgbb } = require('./uploadController');

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
      return res.status(404).json({ message: 'المتجر غير موجود' });
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
        console.log(`[${getTimestamp()}] ❌ Create product failed: Category ${category} not found in store ${storeId}`);
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
      categoryId = category;
    }

    // رفع الصورة إلى imgbb إذا كانت موجودة
    let imageUrl = '';
    if (file) {
      try {
        const uploadResult = await uploadToImgbb(file);
        imageUrl = uploadResult.url;
        console.log(`[${getTimestamp()}] 📸 Image uploaded to imgbb: ${imageUrl}`);
      } catch (err) {
        console.error(`[${getTimestamp()}] ❌ Error uploading image to imgbb:`, err.message);
        return res.status(400).json({ message: `فشل في رفع الصورة: ${err.message}` });
      }
    }

    // إنشاء المنتج
    const newProduct = new Product({
      storeId,
      productName,
      description: description || '',
      price: parseFloat(price),
      hasOffer: offerEnabled,
      originalPrice: offerEnabled ? parseFloat(originalPrice) : undefined,
      discountedPrice: offerEnabled ? parseFloat(discountedPrice) : undefined,
      currency,
      stock: parseInt(stock),
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 10,
      category: categoryId,
      imageUrl
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

    // التحقق من حقول العرض
    const offerEnabled = hasOffer === "yes" || hasOffer === true;
    if (offerEnabled && (!originalPrice || !discountedPrice)) {
      console.log(`[${getTimestamp()}] ❌ Update product failed: Missing offer fields`, { originalPrice, discountedPrice });
      return res.status(400).json({ message: 'السعر قبل وبعد الخصم مطلوبان إذا كان هناك عرض' });
    }

    // التحقق من وجود القسم لو تم اختياره
    let categoryId = product.category;
    if (category) {
      const categoryExists = await Category.findOne({ _id: category, storeId });
      if (!categoryExists) {
        console.log(`[${getTimestamp()}] ❌ Update product failed: Category ${category} not found in store ${storeId}`);
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
      categoryId = category;
    }

    // رفع الصورة إلى imgbb إذا كانت موجودة
    if (file) {
      try {
        const uploadResult = await uploadToImgbb(file);
        product.imageUrl = uploadResult.url;
        console.log(`[${getTimestamp()}] 📸 Image uploaded to imgbb: ${product.imageUrl}`);
      } catch (err) {
        console.error(`[${getTimestamp()}] ❌ Error uploading image to imgbb:`, err.message);
        return res.status(400).json({ message: `فشل في رفع الصورة: ${err.message}` });
      }
    }

    // تحديث الحقول
    if (productName) product.productName = productName;
    if (description) product.description = description;
    if (price) product.price = parseFloat(price);
    product.hasOffer = offerEnabled;
    if (offerEnabled) {
      product.originalPrice = parseFloat(originalPrice);
      product.discountedPrice = parseFloat(discountedPrice);
    } else {
      product.originalPrice = undefined;
      product.discountedPrice = undefined;
    }
    if (currency) product.currency = currency;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (lowStockThreshold) product.lowStockThreshold = parseInt(lowStockThreshold);
    if (category) product.category = categoryId;

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
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // لا نحتاج لحذف الصورة لأنها مخزنة على imgbb
    await product.deleteOne();
    console.log(`[${getTimestamp()}] ✅ Product deleted: ${product.productName} from store ${storeId}`);

    res.status(200).json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error deleting product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في حذف المنتج: ' + (err.message || 'غير معروف') });
  }
};

// جلب كل المنتجات
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
      return res.status(404).json({ message: 'المتجر غير موجود' });
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

// جلب منتج واحد
exports.getProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
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
