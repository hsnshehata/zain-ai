// /server/controllers/productController.js
const Product = require('../models/Product');
const Store = require('../models/Store');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إعداد Multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/products');
    fs.mkdirSync(uploadPath, { recursive: true }); // إنشاء المجلد إذا مش موجود
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('الصور يجب أن تكون بصيغة JPG أو PNG'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // حد 5 ميجابايت
}).single('image');

// إنشاء منتج جديد
exports.createProduct = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error(`[${getTimestamp()}] ❌ Error uploading image:`, err.message);
      return res.status(400).json({ message: err.message });
    }

    const { storeId } = req.params;
    const { productName, description, price, currency, stock, lowStockThreshold, category } = req.body;
    const userId = req.user.userId;

    try {
      console.log(`[${getTimestamp()}] 📡 Creating product for store ${storeId} with data:`, {
        productName,
        description,
        price,
        currency,
        stock,
        lowStockThreshold,
        category,
        hasFile: !!req.file
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

      // إنشاء المنتج
      const newProduct = new Product({
        storeId,
        productName,
        description: description || '',
        price,
        currency,
        stock,
        lowStockThreshold: lowStockThreshold || 10,
        category: category || '',
        imageUrl: req.file ? `/uploads/products/${req.file.filename}` : ''
      });

      await newProduct.save();
      console.log(`[${getTimestamp()}] ✅ Product created: ${newProduct.productName} for store ${storeId}`);

      res.status(201).json(newProduct);
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Error creating product:`, err.message, err.stack);
      res.status(500).json({ message: 'خطأ في إنشاء المنتج: ' + (err.message || 'غير معروف') });
    }
  });
};

// تعديل منتج
exports.updateProduct = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error(`[${getTimestamp()}] ❌ Error uploading image:`, err.message);
      return res.status(400).json({ message: err.message });
    }

    const { storeId, productId } = req.params;
    const { productName, description, price, currency, stock, lowStockThreshold, category } = req.body;
    const userId = req.user.userId;

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

      // تحديث الحقول
      if (productName) product.productName = productName;
      if (description) product.description = description;
      if (price) product.price = price;
      if (currency) product.currency = currency;
      if (stock !== undefined) product.stock = stock;
      if (lowStockThreshold) product.lowStockThreshold = lowStockThreshold;
      if (category) product.category = category;
      if (req.file) product.imageUrl = `/uploads/products/${req.file.filename}`;

      await product.save();
      console.log(`[${getTimestamp()}] ✅ Product updated: ${product.productName} for store ${storeId}`);

      res.status(200).json(product);
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Error updating product:`, err.message, err.stack);
      res.status(500).json({ message: 'خطأ في تعديل المنتج: ' + (err.message || 'غير معروف') });
    }
  });
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

    // حذف الصورة إذا كانت موجودة
    if (product.imageUrl) {
      const imagePath = path.join(__dirname, '../../public', product.imageUrl);
      fs.unlink(imagePath, (err) => {
        if (err) console.error(`[${getTimestamp()}] ⚠️ Error deleting image:`, err.message);
      });
    }

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
  const userId = req.user.userId;

  try {
    console.log(`[${getTimestamp()}] 📡 Attempting to fetch products for store ${storeId} and user ${userId}`);

    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get products failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    const products = await Product.find({ storeId });
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
    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Get product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    console.log(`[${getTimestamp()}] ✅ Fetched product: ${product.productName} for store ${storeId}`);
    res.status(200).json(product);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتج: ' + (err.message || 'غير معروف') });
  }
};
