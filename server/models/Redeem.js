// /server/models/Redeem.js
const mongoose = require('mongoose');

const redeemSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [4, 'الكود يجب أن يكون 4 أحرف على الأقل'],
    maxlength: [20, 'الكود يجب ألا يتجاوز 20 حرف']
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: [0, 'قيمة الخصم يجب أن تكون أكبر من أو تساوي 0']
  },
  minPurchaseAmount: {
    type: Number,
    default: 0,
    min: [0, 'الحد الأدنى للشراء يجب أن يكون أكبر من أو يساوي 0']
  },
  maxDiscountAmount: {
    type: Number,
    default: null,
    min: [0, 'الحد الأقصى للخصم يجب أن يكون أكبر من أو يساوي 0']
  },
  maxUsageCount: {
    type: Number,
    default: null,
    min: [1, 'الحد الأقصى لعدد الاستخدامات يجب أن يكون 1 على الأقل']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'عدد الاستخدامات يجب أن يكون أكبر من أو يساوي 0']
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'الوصف يجب ألا يتجاوز 200 حرف'],
    default: ''
  },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  usedBy: [{
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    usedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// فهرس لتحسين البحث والأداء
redeemSchema.index({ storeId: 1 });
redeemSchema.index({ isActive: 1 });
redeemSchema.index({ validFrom: 1, validUntil: 1 });

// تحديث updatedAt والتحقق من صحة التواريخ
redeemSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // التحقق من أن تاريخ الانتهاء بعد تاريخ البدء
  if (this.validUntil <= this.validFrom) {
    return next(new Error('تاريخ انتهاء الصلاحية يجب أن يكون بعد تاريخ البدء'));
  }
  
  // التحقق من أن قيمة الخصم النسبي لا تتجاوز 100%
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    return next(new Error('نسبة الخصم يجب ألا تتجاوز 100%'));
  }
  
  next();
});

module.exports = mongoose.model('Redeem', redeemSchema);
