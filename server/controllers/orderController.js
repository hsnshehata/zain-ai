// /server/controllers/orderController.js
const Order = require('../models/Order');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Notification = require('../models/Notification');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إنشاء طلب جديد
exports.createOrder = async (req, res) => {
  const { storeId } = req.params;
  const { products, paymentMethod } = req.body;
  const userId = req.user ? req.user.userId : null; // الزبون ممكن يكون زائر

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

    let totalPrice = 0;
    const orderProducts = [];

    // التحقق من المخزون وحساب الإجمالي
    for (const item of products) {
      const product = await Product.findOne({ _id: item.productId, storeId });
      if (!product) {
        console.log(`[${getTimestamp()}] ❌ Create order failed: Product ${item.productId} not found in store ${storeId}`);
        return res.status(404).json({ message: `المنتج ${item.productId} غير موجود` });
      }
      if (product.stock < item.quantity) {
        console.log(`[${getTimestamp()}] ❌ Create order failed: Insufficient stock for product ${product.productName}`);
        return res.status(400).json({ message: `المخزون غير كافٍ للمنتج ${product.productName}` });
      }
      orderProducts.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      });
      totalPrice += product.price * item.quantity;
    }

    // إنشاء الطلب
    const newOrder = new Order({
      storeId,
      userId,
      products: orderProducts,
      totalPrice,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      status: paymentMethod === 'whatsapp_confirmation' ? 'pending' : 'confirmed'
    });

    await newOrder.save();
    console.log(`[${getTimestamp()}] ✅ Order created: ${newOrder._id} for store ${storeId}`);

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
    const notification = new Notification({
      user: store.userId,
      title: `طلب جديد في ${store.storeName}`,
      message: `تم إنشاء طلب جديد (${newOrder._id}) بإجمالي ${totalPrice} ${orderProducts[0].currency || 'EGP'}.`,
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

    // تحديث الحالة
    if (status) {
      order.status = status;
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
    res.status(200).json(orders);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching orders:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب الطلبات' });
  }
};
