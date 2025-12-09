const mongoose = require('mongoose');

const supplierTransactionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['purchase','payment'], required: true },
  note: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupplierTransaction', supplierTransactionSchema);
