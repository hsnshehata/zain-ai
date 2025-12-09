const mongoose = require('mongoose');

const customerTransactionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  amount: { type: Number, required: true }, // positive number
  type: { type: String, enum: ['charge','payment'], required: true },
  note: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CustomerTransaction', customerTransactionSchema);
