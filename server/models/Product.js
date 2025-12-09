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
  // وصف تفصيلي يظهر في صفحة تفاصيل المنتج
  detailedDescription: { type: String, trim: true, default: '' },
  price: {
    type: Number,
    required: true,
    min: [0, 'السعر يجب أن يكون أكبر من أو يساوي 0']
  },
  // سعر التكلفة (يظهر فقط في لوحة التحكم)
  costPrice: {
    type: Number,
    default: 0,
    min: [0, 'سعر التكلفة يجب أن يكون أكبر من أو يساوي 0']
  },
  // الباركود الأساسي للمُنتج (النصي)
  barcode: { type: String, default: '' },
    // حقول الأكواد المولدة (مثال: [numericCode, alnumCode, shortCode])
    generatedCodes: { type: [String], default: [] },
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
  // صور إضافية للمعرض داخل تفاصيل المنتج
  images: { type: [String], default: [] },
  // تمكين خيارات المنتج (مثل المقاسات/الألوان)
  optionsEnabled: { type: Boolean, default: false },
  optionGroups: {
    type: [
      new mongoose.Schema({
        name: { type: String, trim: true, required: true },
        values: { type: [String], default: [] },
        required: { type: Boolean, default: false }
      }, { _id: false })
    ],
    default: []
  },
  salesCount: { type: Number, default: 0, min: [0, 'عدد المبيعات يجب أن يكون أكبر من أو يساوي 0'] }, // إضافة salesCount
  isActive: { type: Boolean, default: true }, // إضافة isActive
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// فهرس لتحسين البحث والأداء
productSchema.index({ storeId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ salesCount: -1 }); // فهرس لتحسين جلب الأكثر مبيعاً

// تحديث updatedAt وتأكيد السعر بعد الخصم
productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.hasOffer && this.discountedPrice >= this.originalPrice) {
    return next(new Error('السعر بعد الخصم يجب أن يكون أقل من السعر الأصلي'));
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
