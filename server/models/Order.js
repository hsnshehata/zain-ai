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
    price: { 
      type: Number, 
      required: true, 
      min: [0, 'السعر يجب ألا يكون سالبًا']
    }
  }],
  totalPrice: { 
    type: Number, 
    required: true, 
    min: [0, 'الإجمالي يجب ألا يكون سالبًا']
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
