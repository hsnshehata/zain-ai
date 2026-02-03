// /server/routes/redeem.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const redeemController = require('../controllers/redeemController');
const logger = require('../logger');

const router = express.Router();

// Middleware لتسجيل الطلبات
router.use((req, res, next) => {
  logger.info(`📡 Redeem Route: ${req.method} ${req.url}`);
  next();
});

// إنشاء كود استرداد
router.post('/:storeId/redeems', authenticate, redeemController.createRedeem);

// تعديل كود استرداد
router.put('/:storeId/redeems/:redeemId', authenticate, redeemController.updateRedeem);

// حذف كود استرداد
router.delete('/:storeId/redeems/:redeemId', authenticate, redeemController.deleteRedeem);

// جلب جميع أكواد الاسترداد
router.get('/:storeId/redeems', authenticate, redeemController.getRedeems);

// جلب كود استرداد واحد
router.get('/:storeId/redeems/:redeemId', authenticate, redeemController.getRedeem);

// التحقق من صحة كود الاسترداد (بدون authenticate للوصول العام من صفحة المتجر)
router.post('/:storeId/redeems/validate', redeemController.validateRedeem);

// تطبيق كود الاسترداد (بدون authenticate للوصول العام من صفحة المتجر)
router.post('/:storeId/redeems/:redeemId/apply', redeemController.applyRedeem);

module.exports = router;
