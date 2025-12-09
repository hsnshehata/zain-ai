const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String },
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
});

const saleSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
  items: [saleItemSchema],
  subtotal: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash','account'], default: 'cash' },
  note: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', saleSchema);
