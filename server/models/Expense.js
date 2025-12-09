const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  type: { type: String, enum: ['expense','advance','deduction'], default: 'expense' },
  payee: { type: String, trim: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  amount: { type: Number, default: 0 },
  reason: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);
