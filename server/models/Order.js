// /server/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // اختياري لأن الزبون ممكن يكون زائر
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { 
      type: Number, 
      required: true, // إصلاح الخطأ: إزالة الـ -
      min: [1, 'الكمية يجب أن تكون 1 على الأقل']
    },
    // اختيارات المنتج (مثلاً: المقاس/اللون) محفوظة مع كل عنصر
    selectedOptions: {
      type: [
        new mongoose.Schema({
          name: { type: String, trim: true, default: '' },
          value: { type: String, trim: true, default: '' }
        }, { _id: false })
      ],
      default: []
    },
    price: { 
      type: Number, 
      required: true, 
      min: [0, 'السعر يجب ألا يكون سالبًا']
    },
    currency: {
      type: String,
      trim: true,
      default: 'EGP'
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    }
  }],
  totalPrice: { 
    type: Number, 
    required: true, 
    min: [0, 'الإجمالي يجب ألا يكون سالبًا']
  },
  currency: {
    type: String,
    trim: true,
    default: 'EGP'
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending'
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash_on_delivery', 'whatsapp_confirmation'], 
    default: 'cash_on_delivery'
  },
  customerName: {
    type: String,
    trim: true,
    default: ''
  },
  customerWhatsapp: {
    type: String,
    trim: true,
    default: ''
  },
  customerEmail: {
    type: String,
    trim: true,
    default: ''
  },
  customerAddress: {
    type: String,
    trim: true,
    default: ''
  },
  customerNote: {
    type: String,
    trim: true,
    default: ''
  },
  // سجل تغيّرات الحالة — يُحفظ كل تغيير مع من غيّره وتاريخ التغيير وملاحظة اختيارية
  history: [{
    status: { type: String, enum: ['pending','confirmed','shipped','delivered','cancelled'], required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: '' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// تحديث تاريخ التعديل
orderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// فهرس لتحسين البحث
orderSchema.index({ storeId: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
