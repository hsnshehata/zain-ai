const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Store = require('../models/Store');
const Bot = require('../models/Bot');
const bcrypt = require('bcryptjs');

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

exports.getEmployees = async (req, res) => {
  const { storeId } = req.params; const { search = '', page = 1, limit = 50 } = req.query; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const pageNum = parseInt(page) || 1; const limitNum = parseInt(limit) || 50; const skip = (pageNum - 1) * limitNum;
    const q = { storeId };
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { username: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    const [items, total] = await Promise.all([ Employee.find(q).sort({ name: 1 }).skip(skip).limit(limitNum), Employee.countDocuments(q) ]);
    res.status(200).json({ users: items, total });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getEmployees:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب الموظفين' });
  }
};

exports.getEmployee = async (req, res) => {
  const { storeId, id } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const emp = await Employee.findOne({ _id: id, storeId });
    if (!emp) return res.status(404).json({ message: 'الموظف غير موجود' });
    res.status(200).json({ user: emp });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error getEmployee:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب الموظف' });
  }
};

exports.createEmployee = async (req, res) => {
  const { storeId } = req.params; const body = req.body; const file = req.file; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const name = body.name || body.fullName || body.username;
    if (!name) return res.status(400).json({ message: 'اسم الموظف مطلوب' });
    const username = (body.username || '').toLowerCase().trim();
    const password = body.password || '';
    const phone = body.phone || '';
    const salary = Number(body.salary) || 0;
    const permissions = body.permissions ? JSON.parse(body.permissions) : (body.permissions || {});
    const emp = new Employee({ storeId, name, username, phone, salary, permissions });
    // ensure employeeId is present (defensive in case DB index expects it)
    if (!emp.employeeId) emp.employeeId = new mongoose.Types.ObjectId();
    if (password) emp.password = await bcrypt.hash(password, 10);
    if (file && file.path) emp.idImageUrl = `/uploads/${file.filename}`;
    await emp.save();
    res.status(201).json({ user: emp });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error createEmployee:`, err.message, err.stack);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في إنشاء الموظف' });
  }
};

exports.updateEmployee = async (req, res) => {
  const { storeId, id } = req.params; const body = req.body; const file = req.file; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const emp = await Employee.findOne({ _id: id, storeId });
    if (!emp) return res.status(404).json({ message: 'الموظف غير موجود' });
    if (body.name) emp.name = body.name;
    if (body.phone) emp.phone = body.phone;
    if (body.salary) emp.salary = Number(body.salary);
    if (body.permissions) emp.permissions = JSON.parse(body.permissions);
    if (body.password) emp.password = await bcrypt.hash(body.password, 10);
    if (file && file.path) emp.idImageUrl = `/uploads/${file.filename}`;
    await emp.save();
    res.status(200).json({ user: emp });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updateEmployee:`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في تحديث الموظف' });
  }
};
