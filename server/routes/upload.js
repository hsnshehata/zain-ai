const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToImgbb } = require('../controllers/uploadController');

// إعداد Multer لاستقبال الصور في الذاكرة (مش هنخزّنها محليًا)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 32 * 1024 * 1024 }, // 32MB max (imgbb limit)
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('يُسمح برفع الصور فقط (PNG، JPEG، GIF)'), false);
    }
    cb(null, true);
  },
});

// Endpoint لرفع الصورة
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم رفع أي صورة' });
    }
    const uploadResult = await uploadToImgbb(req.file, { expiration: 10000 }); 
    res.json({
      imageUrl: uploadResult.url,
      thumbUrl: uploadResult.thumbUrl,
    });
  } catch (err) {
    console.error('خطأ في رفع الصورة:', err);
    res.status(500).json({ message: `فشل في رفع الصورة: ${err.message}` });
  }
});

module.exports = router;
