const Supplier = require('../models/Supplier');
const SupplierTransaction = require('../models/SupplierTransaction');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Bot = require('../models/Bot');

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

exports.getSuppliers = async (req, res) => {
  const { storeId } = req.params;
  const { search = '', page = 1, limit = 20 } = req.query;
  const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const pageNum = parseInt(page) || 1; const limitNum = parseInt(limit) || 20; const skip = (pageNum - 1) * limitNum;
    const q = { storeId };
    if (search) {
      q.$or = [ { name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } } ];
    }
    const [items, total] = await Promise.all([
      Supplier.find(q).sort({ name: 1 }).skip(skip).limit(limitNum),
      Supplier.countDocuments(q)
    ]);
    res.status(200).json({ suppliers: items, total });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getSuppliers:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب الموردين' });
  }
};

exports.getSupplier = async (req, res) => {
  const { storeId, supplierId } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const supplier = await Supplier.findOne({ _id: supplierId, storeId });
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });
    res.status(200).json({ supplier });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getSupplier:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب المورد' });
  }
};

exports.createSupplier = async (req, res) => {
  const { storeId } = req.params; const { name, phone, email, address, notes } = req.body; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    if (!name) return res.status(400).json({ message: 'اسم المورد مطلوب' });
    const s = new Supplier({ storeId, name, phone: phone||'', email: email||'', address: address||'', notes: notes||'' });
    await s.save();
    res.status(201).json({ supplier: s });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error createSupplier:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في إنشاء المورد' });
  }
};

exports.updateSupplier = async (req, res) => {
  const { storeId, supplierId } = req.params; const { name, phone, email, address, notes } = req.body; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const s = await Supplier.findOne({ _id: supplierId, storeId });
    if (!s) return res.status(404).json({ message: 'المورد غير موجود' });
    if (name !== undefined) s.name = name;
    if (phone !== undefined) s.phone = phone;
    if (email !== undefined) s.email = email;
    if (address !== undefined) s.address = address;
    if (notes !== undefined) s.notes = notes;
    await s.save();
    res.status(200).json({ supplier: s });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updateSupplier:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في تحديث المورد' });
  }
};

exports.deleteSupplier = async (req, res) => {
  const { storeId, supplierId } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const s = await Supplier.findOneAndDelete({ _id: supplierId, storeId });
    if (!s) return res.status(404).json({ message: 'المورد غير موجود' });
    res.status(200).json({ message: 'تم حذف المورد' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error deleteSupplier:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في حذف المورد' });
  }
};

exports.getSupplierTransactions = async (req, res) => {
  const { storeId, supplierId } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const tx = await SupplierTransaction.find({ storeId, supplierId }).sort({ createdAt: -1 });
    res.status(200).json({ transactions: tx });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getSupplierTransactions:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب معاملات المورد' });
  }
};

exports.addSupplierTransaction = async (req, res) => {
  const { storeId, supplierId } = req.params; const { amount, type, note } = req.body; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    if (!amount || !['purchase','payment'].includes(type)) return res.status(400).json({ message: 'بيانات المعاملة غير كاملة' });
    const supplier = await Supplier.findOne({ _id: supplierId, storeId });
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });
    const tx = new SupplierTransaction({ storeId, supplierId, amount: Number(amount)||0, type, note: note||'', createdBy: userId });
    await tx.save();
    const delta = (type === 'purchase') ? Number(amount) : -Number(amount);
    supplier.balance = (Number(supplier.balance) || 0) + delta;
    if (type === 'purchase') supplier.totalPurchases = (Number(supplier.totalPurchases)||0) + Number(amount);
    if (type === 'payment') supplier.totalPaid = (Number(supplier.totalPaid)||0) + Number(amount);
    await supplier.save();
    res.status(201).json({ transaction: tx, balance: supplier.balance });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error addSupplierTransaction:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في إضافة المعاملة' });
  }
};

exports.createPurchaseInvoice = async (req, res) => {
  const { storeId, supplierId } = req.params; const payload = req.body; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const supplier = await Supplier.findOne({ _id: supplierId, storeId });
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });
    const invoice = new PurchaseInvoice({ storeId, supplierId, invoiceNumber: payload.invoiceNumber || '', items: payload.items || [], subtotal: payload.subtotal||0, tax: payload.tax||0, total: payload.total||0, paid: payload.paid||0, paymentMethod: payload.paymentMethod||'cash', createdBy: userId });
    await invoice.save();

    // update product stock and costPrice for each item (if productId provided)
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    for (const it of items) {
      try {
        if (it.productId) {
          const prod = await Product.findOne({ _id: it.productId, storeId });
          if (prod) {
            // increase stock
            const qty = Number(it.qty || it.quantity || 0) || 0;
            prod.stock = (Number(prod.stock) || 0) + qty;
            // update costPrice using weighted average if cost provided
            const unitCost = Number(it.unitPrice || it.cost || 0) || 0;
            if (unitCost > 0) {
              const oldStock = Math.max(0, (Number(prod.stock) || 0) - qty);
              const oldCost = Number(prod.costPrice || prod.cost || 0) || 0;
              const newStock = oldStock + qty;
              if (newStock > 0) {
                const newCost = ((oldCost * oldStock) + (unitCost * qty)) / newStock;
                prod.costPrice = Number(newCost || unitCost);
              } else {
                prod.costPrice = unitCost;
              }
            }
            await prod.save();
          }
        }
      } catch (e) {
        console.error(`[${getTimestamp()}] ⚠️ Failed updating product stock for item in invoice ${invoice._id}:`, e.message);
      }
    }

    // update supplier balance and totals
    supplier.totalPurchases = (Number(supplier.totalPurchases)||0) + Number(invoice.total || 0);
    supplier.totalPaid = (Number(supplier.totalPaid)||0) + Number(invoice.paid || 0);
    supplier.balance = (Number(supplier.balance)||0) + (Number(invoice.total || 0) - Number(invoice.paid || 0));
    await supplier.save();
    res.status(201).json({ invoice, balance: supplier.balance });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error createPurchaseInvoice:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في إنشاء فاتورة مشتريات' });
  }
};

exports.getPurchaseInvoices = async (req, res) => {
  const { storeId, supplierId } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const invoices = await PurchaseInvoice.find({ storeId, supplierId }).sort({ createdAt: -1 });
    res.status(200).json({ invoices });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getPurchaseInvoices:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب فواتير المشتريات' });
  }
};

exports.getSupplierStatement = async (req, res) => {
  const { storeId, supplierId } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const supplier = await Supplier.findOne({ _id: supplierId, storeId });
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });
    const transactions = await SupplierTransaction.find({ storeId, supplierId }).sort({ createdAt: -1 });
    const invoices = await PurchaseInvoice.find({ storeId, supplierId }).sort({ createdAt: -1 });
    res.status(200).json({ supplier, transactions, invoices });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getSupplierStatement:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب كشف المورد' });
  }
};
