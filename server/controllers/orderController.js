// /server/controllers/orderController.js
const Order = require('../models/Order');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const Bot = require('../models/Bot');
const { notifyNewOrder, notifyOrderStatus } = require('../services/telegramService');
const { upsertFromOrder } = require('./customersController');
const logger = require('../logger');

// إنشاء طلب جديد
exports.createOrder = async (req, res) => {
  const { storeId } = req.params;
  const {
    products,
    paymentMethod,
    customerName,
    customerWhatsapp,
    customerEmail,
    customerAddress,
    customerNote
  } = req.body;
  const userId = req.user ? req.user.userId : null; // الزبون ممكن يكون زائر

  const sanitizeWhatsapp = (value = '') => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const normalized = trimmed.replace(/\s+/g, '');
    if (normalized.startsWith('+')) {
      return `+${normalized.slice(1).replace(/\D+/g, '')}`;
    }
    return normalized.replace(/\D+/g, '');
  };

  try {
    logger.info('order_create_attempt', {
      storeId,
      userId,
      productsCount: Array.isArray(products) ? products.length : 0,
      paymentMethod
    });

    // التحقق من وجود المتجر
    const store = await Store.findById(storeId);
    if (!store) {
      logger.warn('order_create_store_not_found', { storeId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من المنتجات
    if (!products || !Array.isArray(products) || products.length === 0) {
      logger.warn('order_create_no_products', { storeId });
      return res.status(400).json({ message: 'يجب إرسال قائمة منتجات صالحة' });
    }

    const safeCustomerName = typeof customerName === 'string' ? customerName.trim() : '';
    const sanitizedWhatsapp = sanitizeWhatsapp(customerWhatsapp);
    const safeEmail = typeof customerEmail === 'string' ? customerEmail.trim() : '';
    const safeAddress = typeof customerAddress === 'string' ? customerAddress.trim() : '';
    const safeNote = typeof customerNote === 'string' ? customerNote.trim() : '';
    const safePaymentMethod = paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'whatsapp_confirmation';

    if (!safeCustomerName || sanitizedWhatsapp.length < 6) {
      logger.warn('order_create_missing_customer_details', { storeId });
      return res.status(400).json({ message: 'يرجى إدخال اسمك ورقم واتساب صالح للتواصل.' });
    }
    if (!safeAddress || safeAddress.length < 8) {
      logger.warn('order_create_missing_address', { storeId });
      return res.status(400).json({ message: 'يرجى كتابة العنوان بالتفصيل (المدينة/المنطقة/الشارع/معلم قريب) لإتمام الطلب.' });
    }

    let totalPrice = 0;
    const orderProducts = [];

    // التحقق من المخزون وحساب الإجمالي
    for (const item of products) {
      const productId = item.productId;
      const requestedQuantity = Number(item.quantity);
      if (!productId || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
        logger.warn('order_create_invalid_quantity', { storeId, item });
        return res.status(400).json({ message: 'تم إرسال كمية غير صالحة لأحد المنتجات.' });
      }

      const product = await Product.findOne({ _id: productId, storeId });
      if (!product) {
        logger.warn('order_create_product_not_found', { storeId, productId });
        return res.status(404).json({ message: `المنتج ${productId} غير موجود` });
      }
      const availableStock = typeof product.stock === 'number' ? product.stock : 0;
      if (availableStock < requestedQuantity) {
        logger.warn('order_create_insufficient_stock', {
          storeId,
          productId,
          productName: product.productName,
          availableStock,
          requestedQuantity
        });
        return res.status(400).json({ message: `المخزون غير كافٍ للمنتج ${product.productName}` });
      }
      const unitPrice = product.hasOffer && product.discountedPrice ? product.discountedPrice : product.price;
      const numericPrice = Number(unitPrice) || 0;
      const currency = product.currency || 'EGP';
      // مرر خيارات المنتج لو موجودة
      const selectedOptions = Array.isArray(item.selectedOptions)
        ? item.selectedOptions.filter(o => o && typeof o.name === 'string' && typeof o.value === 'string')
        : [];
      if (selectedOptions.length){
        logger.info('order_create_item_options', {
          storeId,
          productId: product._id,
          productName: product.productName,
          options: selectedOptions.map(o => `${o.name}:${o.value}`).join(' | ')
        });
      }

      orderProducts.push({
        productId: product._id,
        quantity: requestedQuantity,
        selectedOptions,
        price: numericPrice,
        currency,
        name: product.productName,
        imageUrl: product.imageUrl || ''
      });
      totalPrice += numericPrice * requestedQuantity;
    }

    const orderCurrency = orderProducts[0]?.currency || 'EGP';

    // إنشاء الطلب مع history ابتدائي
    const newOrder = new Order({
      storeId,
      userId,
      products: orderProducts,
      totalPrice,
      currency: orderCurrency,
      paymentMethod: safePaymentMethod,
      status: safePaymentMethod === 'whatsapp_confirmation' ? 'pending' : 'confirmed',
      customerName: safeCustomerName,
      customerWhatsapp: sanitizedWhatsapp,
      customerEmail: safeEmail,
      customerAddress: safeAddress,
      customerNote: safeNote,
      history: [{
        status: safePaymentMethod === 'whatsapp_confirmation' ? 'pending' : 'confirmed',
        changedBy: userId || null,
        changedAt: new Date(),
        note: 'تم إنشاء الطلب'
      }]
    });

  await newOrder.save();
  logger.info('order_created', {
    storeId,
    orderId: newOrder._id,
    customerName: safeCustomerName,
    status: newOrder.status,
    totalPrice,
    currency: orderCurrency
  });

    // تحديث ملف العميل
    try {
      await upsertFromOrder({
        storeId,
        name: safeCustomerName,
        phone: sanitizedWhatsapp,
        email: safeEmail,
        address: safeAddress,
        orderTotal: totalPrice,
        currency: orderCurrency,
      });
    } catch (e) {
      logger.warn('order_customer_upsert_failed', { storeId, orderId: newOrder._id, err: e.message });
    }

    // تحديث المخزون إذا الطلب مؤكد
    if (newOrder.status === 'confirmed') {
      for (const item of orderProducts) {
        const product = await Product.findById(item.productId);
        product.stock -= item.quantity;
        await product.save();
        logger.info('order_stock_updated', { storeId, productId: product._id, productName: product.productName, stock: product.stock });
      }
    }

    // إشعار لصاحب المتجر
    let formattedTotal = `${totalPrice.toFixed(2)} ${orderCurrency}`;
    try {
      formattedTotal = new Intl.NumberFormat('ar-EG', { style: 'currency', currency: orderCurrency }).format(totalPrice);
    } catch (formatErr) {
      logger.warn('order_total_format_failed', { storeId, orderId: newOrder._id, currency: orderCurrency, err: formatErr.message });
    }

    const notification = new Notification({
      user: store.userId,
      title: `طلب جديد في ${store.storeName}`,
      message: `تم إنشاء طلب جديد (${newOrder._id}) بإجمالي ${formattedTotal}.`,
      isRead: false
    });
    await notification.save();
    logger.info('order_notification_created', { storeId, orderId: newOrder._id, userId: store.userId });

    // حدد البوت المرتبط بالمتجر (لو لم يُخزَّن botId في المتجر نبحث عنه)
    let botIdForNotify = store.botId || null;
    if (!botIdForNotify) {
      const botForStore = await Bot.findOne({ storeId: store._id }).select('_id');
      if (botForStore) botIdForNotify = botForStore._id;
    }

    try {
      await notifyNewOrder(store.userId, {
        storeName: store.storeName,
        orderId: newOrder._id,
        status: newOrder.status,
        total: totalPrice,
        currency: orderCurrency,
        customerName: safeCustomerName,
        customerAddress: safeAddress,
        customerWhatsapp: sanitizedWhatsapp,
        items: orderProducts,
      }, botIdForNotify);
    } catch (notifyErr) {
      logger.warn('order_notify_new_order_failed', { storeId, orderId: newOrder._id, err: notifyErr.message });
    }

    res.status(201).json(newOrder);
  } catch (err) {
    logger.error('order_create_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في إنشاء الطلب' });
  }
};

// تحديث حالة الطلب
exports.updateOrder = async (req, res) => {
  const { storeId, orderId } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      logger.warn('order_update_store_not_found', { storeId, userId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من وجود الطلب
    const order = await Order.findOne({ _id: orderId, storeId });
    if (!order) {
      logger.warn('order_update_not_found', { storeId, orderId });
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    // حفظ السجل القديم للحالة والتحقق من التغيير
    if (status && status !== order.status) {
      const prevStatus = order.status;
      order.status = status;
      // أضف إدخال إلى history
      if (!Array.isArray(order.history)) order.history = [];
      order.history.push({
        status,
        changedBy: userId || null,
        changedAt: new Date(),
        note: `تغيير الحالة من ${prevStatus} إلى ${status}`
      });

      if (status === 'confirmed' && order.paymentMethod === 'whatsapp_confirmation') {
        // تحديث المخزون عند التأكيد
        for (const item of order.products) {
          const product = await Product.findById(item.productId);
          product.stock -= item.quantity;
          await product.save();
          logger.info('order_update_stock', { storeId, orderId, productId: product._id, productName: product.productName, stock: product.stock });
        }
      }
      await order.save();
      logger.info('order_updated', { storeId, orderId: order._id, status });

      // إشعار لصاحب المتجر
      const notification = new Notification({
        user: store.userId,
        title: `تحديث حالة الطلب ${order._id}`,
        message: `تم تحديث حالة الطلب إلى ${status}.`,
        isRead: false
      });
      await notification.save();
      logger.info('order_status_notification_created', { storeId, orderId: order._id, userId: store.userId, status });

      try {
        let botIdForNotify = store.botId || null;
        if (!botIdForNotify) {
          const botForStore = await Bot.findOne({ storeId: store._id }).select('_id');
          if (botForStore) botIdForNotify = botForStore._id;
        }
        await notifyOrderStatus(store.userId, {
          storeName: store.storeName,
          orderId: order._id,
          status: order.status,
        }, botIdForNotify);
      } catch (notifyErr) {
        logger.warn('order_notify_status_failed', { storeId, orderId: order._id, err: notifyErr.message });
      }
    } else {
      // لو نفس الحالة أو مافي status جديد نرجع الطلب كما هو
      await order.save();
    }

    res.status(200).json(order);
  } catch (err) {
    logger.error('order_update_error', { storeId, orderId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في تحديث الطلب' });
  }
};

// جلب الطلبات
exports.getOrders = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر (لا تمنع العرض إذا كان المستخدم مختلفاً — نكتفي بالتحقق من وجود المتجر)
    const store = await Store.findById(storeId);
    if (!store) {
      logger.warn('orders_fetch_store_not_found', { storeId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    if (String(store.userId) !== String(userId)) {
      logger.warn('orders_fetch_readonly', { storeId, requestedBy: userId, ownerId: store.userId });
    }

    const orders = await Order.find({ storeId }).sort({ createdAt: -1 });
    logger.info('orders_fetch_success', { storeId, count: orders.length });
    // orders الآن تحتوي على حقل history
    res.status(200).json(orders);
  } catch (err) {
    logger.error('orders_fetch_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب الطلبات' });
  }
};
