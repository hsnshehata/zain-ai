// /server/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  productName: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'],
    maxlength: [100, 'اسم المنتج يجب ألا يتجاوز 100 حرف']
  },
  description: { type: String, trim: true, default: '' },
  price: {
    type: Number,
    required: true,
    min: [0, 'السعر يجب أن يكون أكبر من أو يساوي 0']
  },
  hasOffer: { type: Boolean, default: false },
  originalPrice: {
    type: Number,
    required: function () { return this.hasOffer; },
    min: [0, 'السعر الأصلي يجب أن يكون أكبر من أو يساوي 0']
  },
  discountedPrice: {
    type: Number,
    required: function () { return this.hasOffer; },
    min: [0, 'السعر بعد الخصم يجب أن يكون أكبر من أو يساوي 0']
  },
  currency: {
    type: String,
    required: true,
    enum: ['EGP', 'USD', 'SAR'],
    default: 'EGP'
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'المخزون يجب أن يكون أكبر من أو يساوي 0']
  },
  lowStockThreshold: {
    type: Number,
    min: [0, 'عتبة المخزون المنخفض يجب أن تكون أكبر من أو يساوي 0'],
    default: 10
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  imageUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// فهرس لتحسين البحث
productSchema.index({ storeId: 1 });
productSchema.index({ category: 1 });

productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.hasOffer && this.discountedPrice >= this.originalPrice) {
    return next(new Error('السعر بعد الخصم يجب أن يكون أقل من السعر الأصلي'));
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
