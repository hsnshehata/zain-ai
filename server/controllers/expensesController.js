const Expense = require('../models/Expense');
const Store = require('../models/Store');
const Employee = require('../models/Employee');
const Bot = require('../models/Bot');
const logger = require('../logger');

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

exports.getExpenses = async (req, res) => {
  const { storeId } = req.params; const { type, page = 1, limit = 50 } = req.query; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const pageNum = parseInt(page) || 1; const limitNum = parseInt(limit) || 50; const skip = (pageNum - 1) * limitNum;
    const q = { storeId };
    if (type) q.type = type;
    const [items, total] = await Promise.all([
      Expense.find(q).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Expense.countDocuments(q)
    ]);
    res.status(200).json({ expenses: items, total });
  } catch (err) {
    logger.error('expenses_fetch_error', { storeId, err: err.message, stack: err.stack });
    res.status(err.status || 500).json({ message: err.message || 'خطأ في جلب المصروفات' });
  }
};

exports.createExpense = async (req, res) => {
  const { storeId } = req.params; const payload = req.body; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const e = new Expense({ storeId, type: payload.type || 'expense', payee: payload.payee || payload.party || '', employeeId: payload.employeeId || null, amount: Number(payload.amount)||0, reason: payload.reason||'', createdBy: userId });
    await e.save();
    // if it's an advance or deduction and linked to employee, update employee balance
    if (e.employeeId && ['advance','deduction'].includes(e.type)) {
      const emp = await Employee.findOne({ _id: e.employeeId, storeId });
      if (emp) {
        if (e.type === 'advance') emp.advancesBalance = (Number(emp.advancesBalance)||0) + Number(e.amount||0);
        if (e.type === 'deduction') emp.advancesBalance = (Number(emp.advancesBalance)||0) - Number(e.amount||0);
        await emp.save();
      }
    }
    res.status(201).json({ expense: e });
  } catch (err) {
    logger.error('expense_create_error', { storeId, userId, err: err.message, stack: err.stack });
    res.status(err.status || 500).json({ message: err.message || 'خطأ في إنشاء المصروف' });
  }
};

exports.updateExpense = async (req, res) => {
  const { storeId, id } = req.params; const payload = req.body; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const e = await Expense.findOne({ _id: id, storeId });
    if (!e) return res.status(404).json({ message: 'المعاملة غير موجودة' });
    const prevType = e.type; const prevAmount = Number(e.amount||0); const prevEmployee = e.employeeId ? String(e.employeeId) : null;
    // apply updates
    if (payload.type) e.type = payload.type;
    if (typeof payload.amount !== 'undefined') e.amount = Number(payload.amount)||0;
    if (typeof payload.payee !== 'undefined') e.payee = payload.payee;
    if (typeof payload.reason !== 'undefined') e.reason = payload.reason;
    if (typeof payload.employeeId !== 'undefined') e.employeeId = payload.employeeId || null;
    await e.save();
    // adjust employee balances if needed
    try {
      // reverse previous effect
      if (prevEmployee && ['advance','deduction'].includes(prevType)) {
        const empPrev = await Employee.findOne({ _id: prevEmployee, storeId });
        if (empPrev) {
          if (prevType === 'advance') empPrev.advancesBalance = (Number(empPrev.advancesBalance)||0) - prevAmount;
          if (prevType === 'deduction') empPrev.advancesBalance = (Number(empPrev.advancesBalance)||0) + prevAmount;
          await empPrev.save();
        }
      }
      // apply new effect
      if (e.employeeId && ['advance','deduction'].includes(e.type)) {
        const empNew = await Employee.findOne({ _id: e.employeeId, storeId });
        if (empNew) {
          if (e.type === 'advance') empNew.advancesBalance = (Number(empNew.advancesBalance)||0) + Number(e.amount||0);
          if (e.type === 'deduction') empNew.advancesBalance = (Number(empNew.advancesBalance)||0) - Number(e.amount||0);
          await empNew.save();
        }
      }
    } catch (_) { /* non-fatal */ }

    res.status(200).json({ expense: e });
  } catch (err) {
    logger.error('expense_update_error', { storeId, expenseId: id, userId, err: err.message, stack: err.stack });
    res.status(err.status || 500).json({ message: err.message || 'خطأ في تعديل المعاملة' });
  }
};

exports.deleteExpense = async (req, res) => {
  const { storeId, id } = req.params; const userId = req.user.userId; const role = req.user.role;
  try {
    await authorizeStoreAccess(storeId, userId, role);
    const e = await Expense.findOne({ _id: id, storeId });
    if (!e) return res.status(404).json({ message: 'المعاملة غير موجودة' });
    // if linked to employee and affects balance, reverse it
    try {
      if (e.employeeId && ['advance','deduction'].includes(e.type)) {
        const emp = await Employee.findOne({ _id: e.employeeId, storeId });
        if (emp) {
          if (e.type === 'advance') emp.advancesBalance = (Number(emp.advancesBalance)||0) - Number(e.amount||0);
          if (e.type === 'deduction') emp.advancesBalance = (Number(emp.advancesBalance)||0) + Number(e.amount||0);
          await emp.save();
        }
      }
    } catch (_) { /* continue */ }
    // remove the document using the model to avoid calling deprecated/removed instance methods
    await Expense.deleteOne({ _id: id, storeId });
    res.status(200).json({ message: 'تم حذف المعاملة' });
  } catch (err) {
    logger.error('expense_delete_error', { storeId, expenseId: id, userId, err: err.message, stack: err.stack });
    res.status(err.status || 500).json({ message: err.message || 'خطأ في حذف المعاملة' });
  }
};
