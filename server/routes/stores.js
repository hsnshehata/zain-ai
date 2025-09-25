// /server/routes/stores.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const storeController = require('../controllers/storeController');

const router = express.Router();

// إنشاء متجر
router.post('/', authenticate, storeController.createStore);

// تعديل متجر
router.put('/:storeId', authenticate, storeController.updateStore);

// جلب متجر بالـ ObjectId (للمالك)
router.get('/:storeId', authenticate, storeController.getStore);

// جلب متجر بالـ storeLink (للزبائن العاديين، بدون authenticate)
router.get('/store/:storeLink', storeController.getStoreByLink);

module.exports = router;
