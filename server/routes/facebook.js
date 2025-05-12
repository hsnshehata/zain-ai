// /server/routes/facebook.js

const express = require('express');
const router = express.Router();
const facebookController = require('../controllers/facebookController');
const facebookTokenController = require('../controllers/facebookTokenController');
const authenticate = require('../middleware/authenticate');

// Webhook endpoint
router.post('/', facebookController.handleMessage);

// New endpoint to exchange short-lived token for long-lived token
router.post('/exchange-token', authenticate, facebookTokenController.exchangeToken);

module.exports = router;
