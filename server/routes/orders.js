// /server/routes/orders.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const orderController = require('../controllers/orderController');

const router = express.Router();

// إنشاء طلب
router.post('/:storeId/orders', orderController.createOrder); // بدون authenticate عشان الزبائن ممكن يكونوا زوار

// تحديث حالة الطلب
router.put('/:storeId/orders/:orderId', authenticate, orderController.updateOrder);

// جلب الطلبات
router.get('/:storeId/orders', authenticate, orderController.getOrders);

module.exports = router;
