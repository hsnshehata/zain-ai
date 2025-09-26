// /server/routes/products.js
const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/authenticate');
const productController = require('../controllers/productController');

const router = express.Router();

// إعداد Multer لتخزين الملفات في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(null, true); // السماح بالطلبات بدون ملف
    }
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('نوع الصورة غير مدعوم، يرجى رفع صورة بصيغة PNG أو JPEG'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('image');

// Middleware لتسجيل الطلبات
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📡 Product Route: ${req.method} ${req.url}`);
  if (req.file) {
    console.log(`[${new Date().toISOString()}] 📸 File received:`, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } else {
    console.log(`[${new Date().toISOString()}] 📸 No file received`);
  }
  next();
});

// إضافة منتج
router.post('/:storeId/products', authenticate, upload, productController.createProduct);

// تعديل منتج
router.put('/:storeId/products/:productId', authenticate, upload, productController.updateProduct);

// حذف منتج
router.delete('/:storeId/products/:productId', authenticate, productController.deleteProduct);

// جلب المنتجات (بدون authenticate للوصول العام)
router.get('/:storeId/products', productController.getProducts);

// جلب منتج واحد
router.get('/:storeId/products/:productId', authenticate, productController.getProduct);

// جلب المنتجات الأكثر مبيعاً (بدون authenticate للوصول العام)
router.get('/:storeId/products/bestsellers', productController.getBestsellers);

module.exports = router;
