const ChatOrder = require('../models/ChatOrder');
const Bot = require('../models/Bot');
const { notifyChatOrder, notifyOrderStatus } = require('../services/telegramService');

const STATUS_ENUM = ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PENDING_SET = new Set(['pending', 'processing']);

const getTimestamp = () => new Date().toISOString();

const normalizeItems = (items) =>
  Array.isArray(items)
    ? items.filter(Boolean).map((it) => ({
        title: (it.title || '').toString().trim(),
        quantity: Math.max(Number(it.quantity) || 1, 1),
        price: Math.max(Number(it.price) || 0, 0),
        currency: (it.currency || 'EGP').toString().trim(),
        note: (it.note || '').toString().trim(),
      }))
    : [];

const calcTotals = (items, deliveryFee = 0) => {
  const itemsTotal = (items || []).reduce(
    (sum, it) => sum + Number(it.price || 0) * Math.max(Number(it.quantity) || 1, 1),
    0
  );
  const delivery = Math.max(Number(deliveryFee) || 0, 0);
  return { itemsTotal, delivery, grand: itemsTotal + delivery };
};

const isSameItems = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((item, idx) => {
    const other = b[idx];
    return (
      (item.title || '') === (other.title || '') &&
      Number(item.quantity || 1) === Number(other.quantity || 1) &&
      (item.note || '') === (other.note || '') &&
      Number(item.price || 0) === Number(other.price || 0) &&
      (item.currency || 'EGP') === (other.currency || 'EGP')
    );
  });
};

const canAccessBot = async (botId, userId, role) => {
  if (role === 'superadmin') return true;
  const bot = await Bot.findById(botId).select('userId');
  if (!bot) return false;
  return String(bot.userId) === String(userId);
};

async function listOrders(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const isSuperAdmin = role === 'superadmin';

    let botFilter = {};
    if (!isSuperAdmin) {
      const bots = await Bot.find({ userId }).select('_id');
      const botIds = bots.map((b) => b._id);
      if (!botIds.length) {
        return res.json({ orders: [], counts: { total: 0, pending: 0, byStatus: {} } });
      }
      botFilter.botId = { $in: botIds };
    } else if (req.query.botId) {
      botFilter.botId = req.query.botId;
    } else {
      // superadmin without explicit botId: لا نعيد أي بيانات لمنع رؤية كل الطلبات
      return res.json({ orders: [], counts: { total: 0, pending: 0, byStatus: {} } });
    }

    const orders = await ChatOrder.find(botFilter).sort({ lastModifiedAt: -1, createdAt: -1 }).limit(200);

    const counts = { total: orders.length, pending: 0, byStatus: {} };
    orders.forEach((o) => {
      counts.byStatus[o.status] = (counts.byStatus[o.status] || 0) + 1;
      if (PENDING_SET.has(o.status)) counts.pending += 1;
    });

    return res.json({ orders, counts });
  } catch (err) {
    console.error(`[${getTimestamp()}]  listOrders error:`, err.message, err.stack);
    return res.status(500).json({ message: 'خطأ في جلب طلبات المحادثة' });
  }
}

async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const { status, note, items, deliveryFee, totalAmount } = req.body;
    const userId = req.user.userId;
    const role = req.user.role;

    const order = await ChatOrder.findById(id);
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    const prevStatus = order.status;

    const allowed = await canAccessBot(order.botId, userId, role);
    if (!allowed) return res.status(403).json({ message: 'غير مصرح بالوصول لهذا الطلب' });

    const bot = await Bot.findById(order.botId).select('userId name telegramUserId');

    let touched = false;

    if (Array.isArray(items)) {
      order.items = normalizeItems(items);
      touched = true;
    }

    if (deliveryFee !== undefined) {
      order.deliveryFee = Math.max(Number(deliveryFee) || 0, 0);
      touched = true;
    }

    if (totalAmount !== undefined) {
      order.totalAmount = Math.max(Number(totalAmount) || 0, 0);
      touched = true;
    }

    if (status && STATUS_ENUM.includes(status) && status !== order.status) {
      order.status = status;
      if (!Array.isArray(order.history)) order.history = [];
      order.history.push({ status, changedBy: req.user.userId, note: note || '', changedAt: new Date() });
      touched = true;
    } else if (note) {
      if (!Array.isArray(order.history)) order.history = [];
      order.history.push({ status: order.status, changedBy: req.user.userId, note, changedAt: new Date() });
      touched = true;
    }

    if (!order.totalAmount || order.totalAmount <= 0) {
      const totals = calcTotals(order.items, order.deliveryFee);
      order.totalAmount = totals.grand;
      touched = true;
    }

    if (touched) {
      await order.save();
      try {
        if (order.status !== prevStatus && bot?.userId) {
          console.info(`[${getTimestamp()}] 🔔 notify chat order status (dashboard) bot=${bot._id} user=${bot.userId} order=${order._id} status=${order.status}`);
          await notifyOrderStatus(bot.userId, {
            storeName: bot.name,
            orderId: order._id,
            status: order.status,
            note: note || '',
          }, bot._id);
        }
      } catch (notifyErr) {
        console.warn(`[${getTimestamp()}] ⚠️ Telegram notifyOrderStatus (chat) failed for order ${order._id}:`, notifyErr.message);
      }
    }

    return res.json(order);
  } catch (err) {
    console.error(`[${getTimestamp()}]  updateOrder error:`, err.message, err.stack);
    return res.status(500).json({ message: 'خطأ في تحديث طلب المحادثة' });
  }
}

async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    const order = await ChatOrder.findById(id);
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    const allowed = await canAccessBot(order.botId, userId, role);
    if (!allowed) return res.status(403).json({ message: 'غير مصرح بالوصول لهذا الطلب' });

    await order.deleteOne();
    return res.json({ message: 'تم حذف الطلب' });
  } catch (err) {
    console.error(`[${getTimestamp()}]  deleteOrder error:`, err.message, err.stack);
    return res.status(500).json({ message: 'خطأ في حذف طلب المحادثة' });
  }
}

async function createOrUpdateFromExtraction({
  botId,
  channel,
  conversationId,
  sourceUserId,
  sourceUsername,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  customerNote,
  items,
  freeText,
  status,
  messageId,
  deliveryFee,
  totalAmount,
}) {
  if (!botId || !channel || !sourceUserId) throw new Error('botId, channel, sourceUserId مطلوبة');
  const safeStatus = STATUS_ENUM.includes(status) ? status : 'pending';
  const normalizedItems = normalizeItems(items);
  const fee = Math.max(Number(deliveryFee) || 0, 0);
  const totals = calcTotals(normalizedItems, fee);

  console.info(`[${getTimestamp()}] ✏️ chat order upsert start bot=${botId} channel=${channel} conv=${conversationId} status=${safeStatus} items=${normalizedItems.length} msg=${messageId || 'none'}`);

  // تحقق البيانات المطلوبة بعد التطبيع فقط (لا تسعير تلقائي)
  const hasRequiredOrderData = () => {
    const nameOk = Boolean((customerName || '').trim());
    const phoneOk = Boolean((customerPhone || '').trim());
    const addressOk = Boolean((customerAddress || '').trim());
    const itemsArr = Array.isArray(normalizedItems) ? normalizedItems : [];
    const pricedItems = itemsArr.filter(
      (it) => Math.max(Number(it.price) || 0, 0) > 0 && Math.max(Number(it.quantity) || 0, 0) > 0
    );
    return nameOk && phoneOk && addressOk && pricedItems.length > 0;
  };

  const latestOrder = await ChatOrder.findOne({ botId, channel, conversationId }).sort({ createdAt: -1 });

  if (latestOrder && messageId && latestOrder.lastMessageId && latestOrder.lastMessageId === messageId) {
    console.info(`[${getTimestamp()}] ↩️ chat order deduped by messageId bot=${botId} conv=${conversationId} order=${latestOrder._id}`);
    return latestOrder;
  }

  if (latestOrder) {
    const prevStatus = latestOrder.status;
    const sameCustomer =
      (latestOrder.customerPhone || '') === (customerPhone || '') &&
      (latestOrder.customerAddress || '') === (customerAddress || '') &&
      (latestOrder.customerName || '') === (customerName || '');
    const sameItems = isSameItems(latestOrder.items || [], normalizedItems);
    const canReuse = ['pending', 'processing', 'confirmed'].includes(latestOrder.status);
    const isDuplicatePayload = sameCustomer && sameItems;

    if (canReuse || isDuplicatePayload) {
      if (normalizedItems.length) latestOrder.items = normalizedItems;
      if (freeText) latestOrder.freeText = freeText;
      if (customerName) latestOrder.customerName = customerName;
      if (customerPhone) latestOrder.customerPhone = customerPhone;
      if (customerEmail) latestOrder.customerEmail = customerEmail;
      if (customerAddress) latestOrder.customerAddress = customerAddress;
      if (customerNote) latestOrder.customerNote = customerNote;
      if (sourceUsername) latestOrder.sourceUsername = sourceUsername;
      if (messageId) latestOrder.lastMessageId = messageId;

      if (safeStatus !== latestOrder.status) {
        latestOrder.status = safeStatus;
        if (!Array.isArray(latestOrder.history)) latestOrder.history = [];
        latestOrder.history.push({
          status: safeStatus,
          changedBy: null,
          note: 'تحديث تلقائي من المحادثة',
          changedAt: new Date(),
        });
      }

      latestOrder.deliveryFee = fee;
      latestOrder.totalAmount = totalAmount && totalAmount > 0 ? totalAmount : totals.grand;
      // لا نقوم بالحفظ إذا لم تكتمل البيانات المطلوبة
      if (!hasRequiredOrderData()) {
        console.warn(`[${getTimestamp()}] ⚠️ chat order skipped save/notify (missing data) bot=${botId} channel=${channel} conv=${conversationId}`);
        return latestOrder;
      }
      await latestOrder.save();
      console.info(`[${getTimestamp()}] 💾 chat order updated bot=${botId} order=${latestOrder._id} status=${latestOrder.status}`);

      // أرسل إشعاراً بتحديث/طلب دردشة مكتمل بعد الحفظ
      try {
        const bot = await Bot.findById(botId).select('userId name');
        if (bot?.userId) {
          console.info(`[${getTimestamp()}] 🔔 notify chat order (update) bot=${bot._id} user=${bot.userId} order=${latestOrder._id} status=${latestOrder.status}`);
          await notifyChatOrder(bot.userId, {
            botName: bot.name,
            orderId: latestOrder._id,
            status: latestOrder.status,
            customerName: latestOrder.customerName || customerName || '',
            customerPhone: latestOrder.customerPhone || customerPhone || '',
            customerAddress: latestOrder.customerAddress || customerAddress || '',
            items: latestOrder.items,
            total: latestOrder.totalAmount,
            currency: (latestOrder.items?.[0] && latestOrder.items[0].currency) || 'EGP',
          }, botId);

          if (prevStatus !== latestOrder.status) {
            console.info(`[${getTimestamp()}] 🔔 notify chat order STATUS change bot=${bot._id} user=${bot.userId} order=${latestOrder._id} ${prevStatus} -> ${latestOrder.status}`);
            await notifyOrderStatus(bot.userId, {
              storeName: bot.name,
              orderId: latestOrder._id,
              status: latestOrder.status,
              note: 'تحديث من الدردشة',
            }, botId);
          }
        } else {
          console.warn(`[${getTimestamp()}] ⚠️ chat order notify skipped: bot not found or missing owner (bot=${botId})`);
        }
      } catch (notifyErr) {
        console.warn(`[${getTimestamp()}] ⚠️ Telegram notifyChatOrder (update) failed for order ${latestOrder?._id || 'unknown'}:`, notifyErr.message);
      }

      return latestOrder;
    }
  }

  const history = [{ status: safeStatus, changedBy: null, note: 'تم الإنشاء من المحادثة', changedAt: new Date() }];

  // منع إنشاء طلب ببيانات ناقصة (اسم، هاتف، عنوان، بنود مسعّرة)
  if (!hasRequiredOrderData()) {
    console.warn(`[${getTimestamp()}] ⚠️ chat order skipped: missing required data (bot=${botId}, channel=${channel}, conv=${conversationId})`);
    return null;
  }

  const chatOrder = await ChatOrder.create({
    botId,
    channel,
    conversationId,
    sourceUserId,
    sourceUsername: sourceUsername || '',
    customerName: customerName || '',
    customerPhone: customerPhone || '',
    customerEmail: customerEmail || '',
    customerAddress: customerAddress || '',
    customerNote: customerNote || '',
    items: normalizedItems,
    freeText: freeText || '',
    deliveryFee: fee,
    totalAmount: totalAmount && totalAmount > 0 ? totalAmount : totals.grand,
    status: safeStatus,
    lastMessageId: messageId || '',
    history,
  });

  console.info(`[${getTimestamp()}] 💾 chat order created bot=${botId} order=${chatOrder._id} status=${chatOrder.status}`);

  try {
    const bot = await Bot.findById(botId).select('userId name');
    if (bot?.userId) {
      console.info(`[${getTimestamp()}] 🔔 notify chat order (create) bot=${bot._id} user=${bot.userId} order=${chatOrder._id} status=${chatOrder.status}`);
      await notifyChatOrder(bot.userId, {
        botName: bot.name,
        orderId: chatOrder._id,
        status: chatOrder.status,
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        items: normalizedItems,
        total: chatOrder.totalAmount,
        currency: (normalizedItems[0] && normalizedItems[0].currency) || 'EGP',
      }, botId);
    } else {
      console.warn(`[${getTimestamp()}] ⚠️ chat order notify skipped: bot not found or missing owner (bot=${botId})`);
    }
  } catch (notifyErr) {
    console.warn(`[${getTimestamp()}] ⚠️ Telegram notifyChatOrder failed for order ${chatOrder?._id || 'unknown'}:`, notifyErr.message);
  }

  return chatOrder;
}

module.exports = {
  listOrders,
  updateOrder,
  deleteOrder,
  createOrUpdateFromExtraction,
};
