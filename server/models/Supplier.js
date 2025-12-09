const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  name: { type: String, trim: true, required: true },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  balance: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  currency: { type: String, default: 'EGP' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

supplierSchema.index({ storeId: 1, name: 1 });

supplierSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
