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

// إضافة منتج (مع auth)
router.post('/:storeId/products', authenticate, upload, productController.createProduct);

// تعديل منتج (مع auth)
router.put('/:storeId/products/:productId', authenticate, upload, productController.updateProduct);

// حذف منتج (مع auth)
router.delete('/:storeId/products/:productId', authenticate, productController.deleteProduct);

// جلب المنتجات بـ storeId (مع auth، لصاحب المتجر)
router.get('/:storeId/products', authenticate, productController.getProducts);

// جلب المنتجات بالـ storeLink (public، بدون auth)
router.get('/slug/:storeLink/products', productController.getProductsByStoreLink);

module.exports = router;
