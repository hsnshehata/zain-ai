const express = require('express');
const router = express.Router();
const chatPageController = require('../controllers/chatPageController');

router.post('/', chatPageController.createChatPage);
router.put('/:id', chatPageController.updateChatPage);
router.get('/:linkId', chatPageController.getChatPageByLinkId);
router.get('/bot/:botId', chatPageController.getChatPageByBotId);

module.exports = router;
