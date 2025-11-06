// /server/models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [3, 'اسم القسم يجب أن يكون 3 أحرف على الأقل'],
    maxlength: [50, 'اسم القسم يجب ألا يتجاوز 50 حرفًا']
  },
  description: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// فهرس لتحسين البحث
categorySchema.index({ storeId: 1 });
categorySchema.index({ name: 1 });

categorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Category', categorySchema);
