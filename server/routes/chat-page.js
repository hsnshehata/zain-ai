const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createChatPage, updateChatPage, getChatPageByLinkId, getChatPageByBotId } = require('../controllers/chatPageController');

// إعداد Multer لاستقبال الصور في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 32 * 1024 * 1024 }, // 32MB max (imgbb limit)
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('يُسمح برفع الصور بصيغة PNG فقط'), false);
    }
    cb(null, true);
  },
});

// Routes
router.post('/', createChatPage);
router.put('/:id', upload.single('logo'), updateChatPage); // Use multer for logo upload
router.get('/:linkId', getChatPageByLinkId);
router.get('/bot/:botId', getChatPageByBotId);

module.exports = router;
