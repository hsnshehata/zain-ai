const express = require('express');
const authenticate = require('../middleware/authenticate');
const chatCustomersController = require('../controllers/chatCustomersController');

const router = express.Router();

router.get('/', authenticate, chatCustomersController.listCustomers);

module.exports = router;
