const Sale = require('../models/Sale');
const Store = require('../models/Store');
const Bot = require('../models/Bot');
const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');

const getTimestamp = () => new Date().toISOString();

async function authorizeStoreAccess(storeId, userId, userRole) {
  const store = await Store.findById(storeId);
  if (!store) { const e = new Error('المتجر غير موجود'); e.status = 404; throw e; }
  if (userRole === 'superadmin') return store;
  if (String(store.userId) === String(userId)) return store;
  if (store.botId) {
    const bot = await Bot.findById(store.botId);
    if (bot && String(bot.userId) === String(userId)) return store;
  }
  const e = new Error('غير مصرح لك'); e.status = 403; throw e;
}

exports.createSale = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) return res.status(400).json({ message: 'لا توجد عناصر في السلة' });
    const subtotal = Number(payload.subtotal) || items.reduce((s, it) => s + (Number(it.total) || 0), 0);
    const shipping = Number(payload.shipping) || 0;
    const total = Number(payload.total) || (subtotal + shipping);
    const paymentMethod = payload.paymentMethod === 'account' ? 'account' : 'cash';
    const customerId = payload.customerId || null;
    if (paymentMethod === 'account' && !customerId) return res.status(400).json({ message: 'اختيار العميل مطلوب للمبيعات الآجلة' });

    const sale = new Sale({ storeId, customerId, items, subtotal, shipping, total, paymentMethod, note: payload.note||'', createdBy: userId });
    await sale.save();

    // update customer balances/transactions when sale is on account
    if (paymentMethod === 'account' && customerId) {
      const customer = await Customer.findOne({ _id: customerId, storeId });
      if (customer) {
        customer.balance = (Number(customer.balance) || 0) + Number(total || 0);
        customer.totalOrders = (Number(customer.totalOrders) || 0) + 1;
        customer.totalSpent = (Number(customer.totalSpent) || 0) + Number(total || 0);
        customer.lastOrderAt = new Date();
        await customer.save();

        const tx = new CustomerTransaction({ storeId, customerId, amount: Number(total || 0), type: 'charge', note: `فاتورة بيع #${sale._id}`, createdBy: userId });
        await tx.save();
      }
    } else if (paymentMethod === 'cash') {
      // cash sale - record totals for customer summary if customerId present
      if (customerId) {
        const customer = await Customer.findOne({ _id: customerId, storeId });
        if (customer) {
          customer.totalOrders = (Number(customer.totalOrders) || 0) + 1;
          customer.totalSpent = (Number(customer.totalSpent) || 0) + Number(total || 0);
          customer.lastOrderAt = new Date();
          await customer.save();
          // optionally record a payment transaction for cash (type: payment)
          const tx = new CustomerTransaction({ storeId, customerId, amount: Number(total || 0), type: 'payment', note: `فاتورة نقدية #${sale._id}`, createdBy: userId });
          await tx.save();
        }
      }
    }

    res.status(201).json({ sale });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error createSale:`, err.message, err.stack);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في إنشاء عملية البيع' });
  }
};

exports.getSales = async (req, res) => {
  const { storeId } = req.params; const { page = 1, limit = 50 } = req.query; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const pageNum = Math.max(1, parseInt(page) || 1); const limitNum = Math.min(200, parseInt(limit) || 50); const skip = (pageNum -1) * limitNum;
    const [items, total] = await Promise.all([
      Sale.find({ storeId }).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Sale.countDocuments({ storeId })
    ]);
    res.status(200).json({ sales: items, total });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getSales:`, err.message, err.stack);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب المبيعات' });
  }
};

exports.getSale = async (req, res) => {
  const { storeId, saleId } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const sale = await Sale.findOne({ _id: saleId, storeId });
    if (!sale) return res.status(404).json({ message: 'عملية البيع غير موجودة' });
    res.status(200).json({ sale });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getSale:`, err.message, err.stack);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب عملية البيع' });
  }
};
