const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  phone: { type: String, required: true, trim: true },
  name: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  currency: { type: String, default: 'EGP' },
  lastOrderAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

customerSchema.index({ storeId: 1, phone: 1 }, { unique: true });

customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
