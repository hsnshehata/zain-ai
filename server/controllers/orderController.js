// /server/controllers/orderController.js
const Order = require('../models/Order');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { upsertFromOrder } = require('./customersController');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

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
    // التحقق من وجود المتجر
    const store = await Store.findById(storeId);
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Create order failed: Store ${storeId} not found`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من المنتجات
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log(`[${getTimestamp()}] ❌ Create order failed: No valid products provided`);
      return res.status(400).json({ message: 'يجب إرسال قائمة منتجات صالحة' });
    }

    const safeCustomerName = typeof customerName === 'string' ? customerName.trim() : '';
    const sanitizedWhatsapp = sanitizeWhatsapp(customerWhatsapp);
    const safeEmail = typeof customerEmail === 'string' ? customerEmail.trim() : '';
    const safeAddress = typeof customerAddress === 'string' ? customerAddress.trim() : '';
    const safeNote = typeof customerNote === 'string' ? customerNote.trim() : '';
    const safePaymentMethod = paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'whatsapp_confirmation';

    if (!safeCustomerName || sanitizedWhatsapp.length < 6) {
      console.log(`[${getTimestamp()}] ❌ Create order failed: Missing customer details for store ${storeId}`);
      return res.status(400).json({ message: 'يرجى إدخال اسمك ورقم واتساب صالح للتواصل.' });
    }
    if (!safeAddress || safeAddress.length < 8) {
      console.log(`[${getTimestamp()}] ❌ Create order failed: Missing detailed address for store ${storeId}`);
      return res.status(400).json({ message: 'يرجى كتابة العنوان بالتفصيل (المدينة/المنطقة/الشارع/معلم قريب) لإتمام الطلب.' });
    }

    let totalPrice = 0;
    const orderProducts = [];

    // التحقق من المخزون وحساب الإجمالي
    for (const item of products) {
      const productId = item.productId;
      const requestedQuantity = Number(item.quantity);
      if (!productId || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
        console.log(`[${getTimestamp()}] ❌ Create order failed: Invalid quantity for item ${JSON.stringify(item)} in store ${storeId}`);
        return res.status(400).json({ message: 'تم إرسال كمية غير صالحة لأحد المنتجات.' });
      }

      const product = await Product.findOne({ _id: productId, storeId });
      if (!product) {
        console.log(`[${getTimestamp()}] ❌ Create order failed: Product ${productId} not found in store ${storeId}`);
        return res.status(404).json({ message: `المنتج ${productId} غير موجود` });
      }
      const availableStock = typeof product.stock === 'number' ? product.stock : 0;
      if (availableStock < requestedQuantity) {
        console.log(`[${getTimestamp()}] ❌ Create order failed: Insufficient stock for product ${product.productName}`);
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
        console.log(`[${getTimestamp()}] 🧩 Order item options for product ${product.productName}:`, selectedOptions.map(o=>`${o.name}:${o.value}`).join(' | '));
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
  console.log(`[${getTimestamp()}] ✅ Order created: ${newOrder._id} for store ${storeId} (customer: ${safeCustomerName})`);

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
      console.warn(`[${getTimestamp()}] ⚠️ Failed to upsert customer for order ${newOrder._id}:`, e.message);
    }

    // تحديث المخزون إذا الطلب مؤكد
    if (newOrder.status === 'confirmed') {
      for (const item of orderProducts) {
        const product = await Product.findById(item.productId);
        product.stock -= item.quantity;
        await product.save();
        console.log(`[${getTimestamp()}] ✅ Updated stock for product ${product.productName}: ${product.stock}`);
      }
    }

    // إشعار لصاحب المتجر
    let formattedTotal = `${totalPrice.toFixed(2)} ${orderCurrency}`;
    try {
      formattedTotal = new Intl.NumberFormat('ar-EG', { style: 'currency', currency: orderCurrency }).format(totalPrice);
    } catch (formatErr) {
      console.warn(`[${getTimestamp()}] ⚠️ Unable to format order total`, formatErr.message);
    }

    const notification = new Notification({
      user: store.userId,
      title: `طلب جديد في ${store.storeName}`,
      message: `تم إنشاء طلب جديد (${newOrder._id}) بإجمالي ${formattedTotal}.`,
      isRead: false
    });
    await notification.save();
    console.log(`[${getTimestamp()}] ✅ Notification sent to user ${store.userId} for order ${newOrder._id}`);

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating order:`, err.message, err.stack);
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
      console.log(`[${getTimestamp()}] ❌ Update order failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من وجود الطلب
    const order = await Order.findOne({ _id: orderId, storeId });
    if (!order) {
      console.log(`[${getTimestamp()}] ❌ Update order failed: Order ${orderId} not found in store ${storeId}`);
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
          console.log(`[${getTimestamp()}] ✅ Updated stock for product ${product.productName}: ${product.stock}`);
        }
      }
      await order.save();
      console.log(`[${getTimestamp()}] ✅ Order updated: ${order._id} to status ${status}`);

      // إشعار لصاحب المتجر
      const notification = new Notification({
        user: store.userId,
        title: `تحديث حالة الطلب ${order._id}`,
        message: `تم تحديث حالة الطلب إلى ${status}.`,
        isRead: false
      });
      await notification.save();
      console.log(`[${getTimestamp()}] ✅ Notification sent to user ${store.userId} for order ${order._id}`);
    } else {
      // لو نفس الحالة أو مافي status جديد نرجع الطلب كما هو
      await order.save();
    }

    res.status(200).json(order);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updating order:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في تحديث الطلب' });
  }
};

// جلب الطلبات
exports.getOrders = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get orders failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    const orders = await Order.find({ storeId }).sort({ createdAt: -1 });
    console.log(`[${getTimestamp()}] ✅ Fetched ${orders.length} orders for store ${storeId}`);
    // orders الآن تحتوي على حقل history
    res.status(200).json(orders);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching orders:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب الطلبات' });
  }
};
