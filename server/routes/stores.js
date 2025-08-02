// /server/routes/stores.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const storeController = require('../controllers/storeController');

const router = express.Router();

// إنشاء متجر
router.post('/', authenticate, storeController.createStore);

// تعديل متجر
router.put('/:storeId', authenticate, storeController.updateStore);

// جلب متجر
router.get('/:storeId', authenticate, storeController.getStore);

module.exports = router;
