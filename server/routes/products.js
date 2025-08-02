// /server/routes/products.js
const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/authenticate');
const productController = require('../controllers/productController');

const router = express.Router();

// إعداد Multer لرفع الصور
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 32 * 1024 * 1024 }, // 32MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الصورة غير مدعوم، يرجى رفع صورة بصيغة PNG، JPEG، أو GIF'));
    }
  }
});

// إضافة منتج
router.post('/:storeId/products', authenticate, upload.single('image'), productController.createProduct);

// تعديل منتج
router.put('/:storeId/products/:productId', authenticate, upload.single('image'), productController.updateProduct);

// حذف منتج
router.delete('/:storeId/products/:productId', authenticate, productController.deleteProduct);

// جلب المنتجات
router.get('/:storeId/products', authenticate, productController.getProducts);

module.exports = router;
