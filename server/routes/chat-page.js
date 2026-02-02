const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createChatPage, updateChatPage, getChatPageByLinkId, getChatPageByBotId, submitFeedback } = require('../controllers/chatPageController');
const authenticate = require('../middleware/authenticate');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 32 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('يُسمح برفع الصور بصيغة PNG فقط'), false);
    }
    cb(null, true);
  },
});

// Routes
router.post('/', authenticate, createChatPage);
router.put('/:id', authenticate, upload.single('logo'), updateChatPage);
router.get('/:linkId', getChatPageByLinkId);
router.get('/bot/:botId', authenticate, getChatPageByBotId);
router.post('/feedback', submitFeedback);

module.exports = router;
