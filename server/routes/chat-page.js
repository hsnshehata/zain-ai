const express = require('express');
const router = express.Router();
const chatPageController = require('../controllers/chatPageController');

// Create a new chat page
router.post('/', chatPageController.createChatPage);

module.exports = router;
