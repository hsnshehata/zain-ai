// /server/routes/stores.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const storeController = require('../controllers/storeController');

const router = express.Router();

// إنشاء متجر (مع auth)
router.post('/', authenticate, storeController.createStore);

// تعديل متجر (مع auth، بـ _id)
router.put('/:storeId', authenticate, storeController.updateStore);

// جلب متجر بـ _id (مع auth، للصاحب)
router.get('/:storeId', authenticate, storeController.getStore);

// جلب متجر بالslug (public، بدون auth)
router.get('/slug/:storeLink', storeController.getStoreByLink);

module.exports = router;
