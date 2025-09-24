// /server/routes/products.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/authenticate');
const productController = require('../controllers/productController');

const router = express.Router();

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
      cb(null, true);
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
    console.log(`[${new Date().toISOString()}] 📸 File received:`, req.file);
  }
  next();
});

// إضافة منتج
router.post('/:storeId/products', authenticate, upload, productController.createProduct);

// تعديل منتج
router.put('/:storeId/products/:productId', authenticate, upload, productController.updateProduct);

// حذف منتج
router.delete('/:storeId/products/:productId', authenticate, productController.deleteProduct);

// جلب المنتجات
router.get('/:storeId/products', authenticate, productController.getProducts);

module.exports = router;
