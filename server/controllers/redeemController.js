// /server/controllers/redeemController.js
const Redeem = require('../models/Redeem');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Bot = require('../models/Bot');
const logger = require('../logger');
const mongoose = require('mongoose');

// دالة مساعدة للتحقق من صلاحية الوصول للمتجر
async function authorizeStoreAccess(storeId, userId, userRole) {
  const store = await Store.findById(storeId);
  if (!store) {
    const e = new Error('المتجر غير موجود');
    e.status = 404;
    throw e;
  }
  if (userRole === 'superadmin') return store;
  if (String(store.userId) === String(userId)) return store;
  if (store.botId) {
    const bot = await Bot.findById(store.botId);
    if (bot && String(bot.userId) === String(userId)) return store;
  }
  const e = new Error('غير مصرح لك');
  e.status = 403;
  throw e;
}

// إنشاء كود استرداد جديد
exports.createRedeem = async (req, res) => {
  const { storeId } = req.params;
  const {
    code,
    discountType,
    discountValue,
    minPurchaseAmount,
    maxDiscountAmount,
    maxUsageCount,
    validFrom,
    validUntil,
    description,
    applicableProducts,
    applicableCategories
  } = req.body;
  const userId = req.user.userId;

  try {
    logger.info('redeem_create_attempt', {
      storeId,
      userId,
      code,
      discountType,
      discountValue
    });

    // التحقق من وجود المتجر وملكيته
    try {
      await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('redeem_create_auth_failed', { storeId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من الحقول المطلوبة
    if (!code || !discountType || discountValue === undefined || !validUntil) {
      logger.warn('redeem_create_missing_fields', { storeId, code, discountType, discountValue, validUntil });
      return res.status(400).json({ message: 'الكود، نوع الخصم، قيمة الخصم، وتاريخ الانتهاء مطلوبة' });
    }

    // التحقق من عدم وجود الكود مسبقاً في نفس المتجر
    const existingRedeem = await Redeem.findOne({ storeId, code: code.toUpperCase() });
    if (existingRedeem) {
      logger.warn('redeem_code_exists', { storeId, code });
      return res.status(400).json({ message: 'الكود موجود بالفعل' });
    }

    // إنشاء كود الاسترداد
    const newRedeem = new Redeem({
      storeId,
      code: code.toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      maxUsageCount: maxUsageCount ? parseInt(maxUsageCount) : null,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      description: description || '',
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      isActive: true
    });

    await newRedeem.save();
    logger.info('redeem_created', { storeId, code: newRedeem.code });
    res.status(201).json(newRedeem);
  } catch (err) {
    logger.error('redeem_create_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في إنشاء كود الاسترداد: ' + (err.message || 'غير معروف') });
  }
};

// تعديل كود استرداد
exports.updateRedeem = async (req, res) => {
  const { storeId, redeemId } = req.params;
  const {
    code,
    discountType,
    discountValue,
    minPurchaseAmount,
    maxDiscountAmount,
    maxUsageCount,
    validFrom,
    validUntil,
    isActive,
    description,
    applicableProducts,
    applicableCategories
  } = req.body;
  const userId = req.user.userId;

  try {
    logger.info('redeem_update_attempt', { storeId, redeemId, userId });

    // التحقق من وجود المتجر وملكيته
    try {
      await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('redeem_update_auth_failed', { storeId, redeemId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود كود الاسترداد
    const redeem = await Redeem.findOne({ _id: redeemId, storeId });
    if (!redeem) {
      logger.warn('redeem_update_not_found', { storeId, redeemId });
      return res.status(404).json({ message: 'كود الاسترداد غير موجود' });
    }

    // التحقق من عدم تكرار الكود إذا تم تغييره
    if (code && code.toUpperCase() !== redeem.code) {
      const existingRedeem = await Redeem.findOne({ storeId, code: code.toUpperCase(), _id: { $ne: redeemId } });
      if (existingRedeem) {
        logger.warn('redeem_code_exists', { storeId, code });
        return res.status(400).json({ message: 'الكود موجود بالفعل' });
      }
      redeem.code = code.toUpperCase();
    }

    // تحديث الحقول
    if (discountType) redeem.discountType = discountType;
    if (discountValue !== undefined) redeem.discountValue = parseFloat(discountValue);
    if (minPurchaseAmount !== undefined) redeem.minPurchaseAmount = parseFloat(minPurchaseAmount);
    if (maxDiscountAmount !== undefined) redeem.maxDiscountAmount = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null;
    if (maxUsageCount !== undefined) redeem.maxUsageCount = maxUsageCount ? parseInt(maxUsageCount) : null;
    if (validFrom) redeem.validFrom = new Date(validFrom);
    if (validUntil) redeem.validUntil = new Date(validUntil);
    if (isActive !== undefined) redeem.isActive = isActive;
    if (description !== undefined) redeem.description = description;
    if (applicableProducts !== undefined) redeem.applicableProducts = applicableProducts;
    if (applicableCategories !== undefined) redeem.applicableCategories = applicableCategories;

    await redeem.save();
    logger.info('redeem_updated', { storeId, redeemId, code: redeem.code });
    res.status(200).json(redeem);
  } catch (err) {
    logger.error('redeem_update_error', { storeId, redeemId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في تعديل كود الاسترداد: ' + (err.message || 'غير معروف') });
  }
};

// حذف كود استرداد
exports.deleteRedeem = async (req, res) => {
  const { storeId, redeemId } = req.params;
  const userId = req.user.userId;

  try {
    logger.info('redeem_delete_attempt', { storeId, redeemId, userId });

    // التحقق من وجود المتجر وملكيته
    try {
      await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('redeem_delete_auth_failed', { storeId, redeemId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود كود الاسترداد
    const redeem = await Redeem.findOne({ _id: redeemId, storeId });
    if (!redeem) {
      logger.warn('redeem_delete_not_found', { storeId, redeemId });
      return res.status(404).json({ message: 'كود الاسترداد غير موجود' });
    }

    await redeem.deleteOne();
    logger.info('redeem_deleted', { storeId, redeemId, code: redeem.code });
    res.status(200).json({ message: 'تم حذف كود الاسترداد بنجاح' });
  } catch (err) {
    logger.error('redeem_delete_error', { storeId, redeemId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في حذف كود الاسترداد: ' + (err.message || 'غير معروف') });
  }
};

// جلب جميع أكواد الاسترداد لمتجر معين
exports.getRedeems = async (req, res) => {
  const { storeId } = req.params;
  const { page, limit, isActive, search } = req.query;
  const userId = req.user.userId;

  try {
    logger.info('redeems_fetch_attempt', { storeId, userId, page, limit, isActive, search });

    // التحقق من وجود المتجر وملكيته
    try {
      await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('redeems_fetch_auth_failed', { storeId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // بناء الاستعلام
    const query = { storeId };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // جلب عدد الأكواد الكلي
    const total = await Redeem.countDocuments(query);

    // جلب الأكواد
    const redeems = await Redeem.find(query)
      .populate('applicableProducts', 'productName imageUrl')
      .populate('applicableCategories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    logger.info('redeems_fetch_success', { storeId, count: redeems.length, total });
    res.status(200).json({ redeems, total });
  } catch (err) {
    logger.error('redeems_fetch_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب أكواد الاسترداد: ' + (err.message || 'غير معروف') });
  }
};

// جلب كود استرداد واحد
exports.getRedeem = async (req, res) => {
  const { storeId, redeemId } = req.params;
  const userId = req.user.userId;

  try {
    logger.info('redeem_fetch_attempt', { storeId, redeemId, userId });

    // التحقق من وجود المتجر وملكيته
    try {
      await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('redeem_fetch_auth_failed', { storeId, redeemId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود كود الاسترداد
    const redeem = await Redeem.findOne({ _id: redeemId, storeId })
      .populate('applicableProducts', 'productName imageUrl')
      .populate('applicableCategories', 'name')
      .populate('usedBy.customerId', 'name phone')
      .populate('usedBy.orderId', 'orderNumber totalPrice');

    if (!redeem) {
      logger.warn('redeem_fetch_not_found', { storeId, redeemId });
      return res.status(404).json({ message: 'كود الاسترداد غير موجود' });
    }

    logger.info('redeem_fetch_success', { storeId, redeemId, code: redeem.code });
    res.status(200).json(redeem);
  } catch (err) {
    logger.error('redeem_fetch_error', { storeId, redeemId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب كود الاسترداد: ' + (err.message || 'غير معروف') });
  }
};

// التحقق من صحة كود الاسترداد
exports.validateRedeem = async (req, res) => {
  const { storeId } = req.params;
  const { code, totalAmount, products } = req.body;

  try {
    logger.info('redeem_validate_attempt', { storeId, code, totalAmount });

    // التحقق من وجود المتجر
    const store = await Store.findById(storeId);
    if (!store) {
      logger.warn('redeem_validate_store_not_found', { storeId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // البحث عن كود الاسترداد
    const redeem = await Redeem.findOne({ storeId, code: code.toUpperCase() });
    if (!redeem) {
      logger.warn('redeem_validate_not_found', { storeId, code });
      return res.status(404).json({ message: 'الكود غير موجود', valid: false });
    }

    // التحقق من أن الكود نشط
    if (!redeem.isActive) {
      logger.warn('redeem_validate_inactive', { storeId, code });
      return res.status(400).json({ message: 'الكود غير نشط', valid: false });
    }

    // التحقق من صلاحية التاريخ
    const now = new Date();
    if (now < redeem.validFrom || now > redeem.validUntil) {
      logger.warn('redeem_validate_expired', { storeId, code, validFrom: redeem.validFrom, validUntil: redeem.validUntil });
      return res.status(400).json({ message: 'الكود منتهي الصلاحية', valid: false });
    }

    // التحقق من عدد الاستخدامات
    if (redeem.maxUsageCount && redeem.usageCount >= redeem.maxUsageCount) {
      logger.warn('redeem_validate_max_usage', { storeId, code, usageCount: redeem.usageCount, maxUsageCount: redeem.maxUsageCount });
      return res.status(400).json({ message: 'تم استخدام الكود الحد الأقصى من المرات', valid: false });
    }

    // التحقق من الحد الأدنى للشراء
    const purchaseAmount = parseFloat(totalAmount) || 0;
    if (purchaseAmount < redeem.minPurchaseAmount) {
      logger.warn('redeem_validate_min_purchase', { storeId, code, totalAmount: purchaseAmount, minPurchaseAmount: redeem.minPurchaseAmount });
      return res.status(400).json({
        message: `الحد الأدنى للشراء ${redeem.minPurchaseAmount} ${store.currency || 'EGP'}`,
        valid: false
      });
    }

    // التحقق من المنتجات المطبقة
    if (redeem.applicableProducts && redeem.applicableProducts.length > 0 && products) {
      const productIds = products.map(p => String(p.productId));
      const hasApplicableProduct = redeem.applicableProducts.some(ap => productIds.includes(String(ap)));
      if (!hasApplicableProduct) {
        logger.warn('redeem_validate_no_applicable_products', { storeId, code });
        return res.status(400).json({ message: 'الكود غير قابل للتطبيق على هذه المنتجات', valid: false });
      }
    }

    // التحقق من الفئات المطبقة
    if (redeem.applicableCategories && redeem.applicableCategories.length > 0 && products) {
      const productObjs = await Product.find({ _id: { $in: products.map(p => p.productId) } });
      const categoryIds = productObjs.map(p => String(p.category)).filter(Boolean);
      const hasApplicableCategory = redeem.applicableCategories.some(ac => categoryIds.includes(String(ac)));
      if (!hasApplicableCategory) {
        logger.warn('redeem_validate_no_applicable_categories', { storeId, code });
        return res.status(400).json({ message: 'الكود غير قابل للتطبيق على هذه الفئات', valid: false });
      }
    }

    // حساب قيمة الخصم
    let discountAmount = 0;
    if (redeem.discountType === 'percentage') {
      discountAmount = (purchaseAmount * redeem.discountValue) / 100;
      if (redeem.maxDiscountAmount && discountAmount > redeem.maxDiscountAmount) {
        discountAmount = redeem.maxDiscountAmount;
      }
    } else {
      discountAmount = redeem.discountValue;
    }

    // التأكد من أن الخصم لا يتجاوز قيمة الشراء
    if (discountAmount > purchaseAmount) {
      discountAmount = purchaseAmount;
    }

    logger.info('redeem_validate_success', { storeId, code, discountAmount });
    res.status(200).json({
      valid: true,
      message: 'الكود صالح',
      discountAmount,
      discountType: redeem.discountType,
      discountValue: redeem.discountValue,
      redeemId: redeem._id
    });
  } catch (err) {
    logger.error('redeem_validate_error', { storeId, code, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في التحقق من كود الاسترداد: ' + (err.message || 'غير معروف'), valid: false });
  }
};

// تطبيق كود الاسترداد (يتم استدعاؤه عند إتمام الطلب)
exports.applyRedeem = async (req, res) => {
  const { storeId, redeemId } = req.params;
  const { customerId, orderId } = req.body;

  try {
    logger.info('redeem_apply_attempt', { storeId, redeemId, customerId, orderId });

    // التحقق من وجود كود الاسترداد
    const redeem = await Redeem.findOne({ _id: redeemId, storeId });
    if (!redeem) {
      logger.warn('redeem_apply_not_found', { storeId, redeemId });
      return res.status(404).json({ message: 'كود الاسترداد غير موجود' });
    }

    // إضافة استخدام الكود
    redeem.usageCount += 1;
    redeem.usedBy.push({
      customerId,
      orderId,
      usedAt: new Date()
    });

    await redeem.save();
    logger.info('redeem_applied', { storeId, redeemId, code: redeem.code, usageCount: redeem.usageCount });
    res.status(200).json({ message: 'تم تطبيق كود الاسترداد بنجاح', usageCount: redeem.usageCount });
  } catch (err) {
    logger.error('redeem_apply_error', { storeId, redeemId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في تطبيق كود الاسترداد: ' + (err.message || 'غير معروف') });
  }
};
