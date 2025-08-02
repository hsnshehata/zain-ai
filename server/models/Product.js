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
    min: [0, 'السعر يجب ألا يكون سالبًا']
  },
  currency: { 
    type: String, 
    required: true, 
    enum: ['EGP', 'USD', 'SAR', 'AED'], // عملات مدعومة
    default: 'EGP'
  },
  imageUrl: { 
    type: String, 
    trim: true,
    match: [/^https?:\/\/.+$/, 'رابط الصورة يجب أن يكون رابطًا صالحًا']
  },
  stock: { 
    type: Number, 
    required: true, 
    min: [0, 'المخزون يجب ألا يكون سالبًا'],
    default: 0 
  },
  lowStockThreshold: { 
    type: Number, 
    default: 10, // عتبة إشعار انخفاض المخزون
    min: [0, 'عتبة المخزون يجب ألا تكون سالبة']
  },
  category: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// تحديث تاريخ التعديل
productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// فهرس لتحسين البحث
productSchema.index({ storeId: 1 });
productSchema.index({ productName: 1 });

module.exports = mongoose.model('Product', productSchema);
