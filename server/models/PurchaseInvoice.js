const mongoose = require('mongoose');

const purchaseInvoiceSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  invoiceNumber: { type: String, trim: true },
  items: [{ productId: mongoose.Schema.Types.ObjectId, name: String, qty: Number, unitPrice: Number, total: Number }],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  currency: { type: String, default: 'EGP' },
  paymentMethod: { type: String, default: 'cash' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
