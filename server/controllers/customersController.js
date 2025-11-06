// /server/controllers/customersController.js
const Customer = require('../models/Customer');
const Store = require('../models/Store');
const Order = require('../models/Order');
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

// قائمة العملاء
exports.getCustomers = async (req, res) => {
  const { storeId } = req.params;
  const { search = '', page = 1, limit = 10 } = req.query;
  const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const pageNum = parseInt(page) || 1; const limitNum = parseInt(limit) || 10; const skip = (pageNum - 1) * limitNum;
    const q = { storeId };
    if (search) {
      q.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      Customer.find(q).sort({ lastOrderAt: -1 }).skip(skip).limit(limitNum),
      Customer.countDocuments(q)
    ]);
    res.status(200).json({ customers: items, total });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getCustomers:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب العملاء' });
  }
};

// تفاصيل عميل مع طلباته
exports.getCustomerDetails = async (req, res) => {
  const { storeId, customerId } = req.params;
  const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const customer = await Customer.findOne({ _id: customerId, storeId });
    if (!customer) return res.status(404).json({ message: 'العميل غير موجود' });
    const orders = await Order.find({ storeId, customerWhatsapp: customer.phone }).sort({ createdAt: -1 });
    res.status(200).json({ customer, orders });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getCustomerDetails:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب ملف العميل' });
  }
};

// بحث عميل بالهاتف (استخدام لاحقًا في صفحة المتجر)
exports.lookupByPhone = async (req, res) => {
  const { storeId } = req.params; const { phone } = req.query;
  try {
    if (!phone) return res.status(400).json({ message: 'رقم الهاتف مطلوب' });
    const customer = await Customer.findOne({ storeId, phone });
    if (!customer) return res.status(404).json({ message: 'لا يوجد عميل لهذا الرقم' });
    res.status(200).json(customer);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error lookupByPhone:`, err.message);
    res.status(500).json({ message: 'خطأ في البحث عن العميل' });
  }
};

// تحديث/إنشاء عميل (داخليًا)
exports.upsertFromOrder = async ({ storeId, name, phone, email, address, orderTotal, currency }) => {
  try {
    const now = new Date();
    const update = {
      name: name || '',
      email: email || '',
      address: address || '',
      $inc: { totalOrders: 1, totalSpent: Number(orderTotal) || 0 },
      currency: currency || 'EGP',
      lastOrderAt: now,
      updatedAt: now,
    };
    await Customer.updateOne({ storeId, phone }, update, { upsert: true });
    console.log(`[${getTimestamp()}] ✅ Customer upserted for ${phone} in store ${storeId}`);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error upsertFromOrder:`, err.message);
  }
};

// Lookup عام بالهاتف — يعيد بيانات أساسية فقط بدون مصادقة
exports.publicLookup = async (req, res) => {
  const { storeId } = req.params; const { phone } = req.query;
  try {
    if (!phone) return res.status(400).json({ message: 'رقم الهاتف مطلوب' });
    // تبسيط الرقم: الاحتفاظ بالأرقام فقط للمطابقة المرنة
    const digits = String(phone).replace(/\D+/g,'');
    if (digits.length < 6) return res.status(400).json({ message: 'رقم غير صالح' });
    // نحاول المطابقة بالضبط أولاً، ولو مافيش نجرّب يحتوي على (بحرص)
    let customer = await Customer.findOne({ storeId, phone: { $in: [phone, digits] } }, { name:1, phone:1, email:1, address:1, _id:0 });
    if (!customer){
      customer = await Customer.findOne({ storeId, phone: { $regex: digits.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'), $options: 'i' } }, { name:1, phone:1, email:1, address:1, _id:0 });
    }
    if (!customer) return res.status(404).json({ message: 'لا يوجد عميل لهذا الرقم' });
    return res.status(200).json(customer);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error publicLookup:`, err.message);
    res.status(500).json({ message: 'خطأ في البحث عن العميل' });
  }
};
