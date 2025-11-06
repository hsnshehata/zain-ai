// /server/routes/customers.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/customersController');

const router = express.Router();

// قائمة العملاء ومشاهدة التفاصيل تتطلب صلاحية المالك/مدير المتجر
router.get('/:storeId/customers', authenticate, ctrl.getCustomers);
router.get('/:storeId/customers/:customerId', authenticate, ctrl.getCustomerDetails);
// lookup بالهاتف (خاص بلوحة التحكم)
router.get('/:storeId/customers-lookup', authenticate, ctrl.lookupByPhone);
// lookup عام بالهاتف لواجهة المتجر — يعيد فقط name/phone/email/address
router.get('/public/:storeId/lookup', ctrl.publicLookup);

module.exports = router;
