const express = require('express');
const authenticate = require('../middleware/authenticate');
const chatOrdersController = require('../controllers/chatOrdersController');

const router = express.Router();

// قائمة طلبات المحادثة مع عدادات للحالات
router.get('/', authenticate, chatOrdersController.listOrders);

// تحديث حالة أو تفاصيل الطلب
router.put('/:id', authenticate, chatOrdersController.updateOrder);

// حذف طلب محادثة
router.delete('/:id', authenticate, chatOrdersController.deleteOrder);

module.exports = router;
