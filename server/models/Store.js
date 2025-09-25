// /server/models/Store.js
const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storeName: { 
    type: String, 
    required: true, 
    trim: true,
    unique: true,
    minlength: [3, 'اسم المتجر يجب أن يكون 3 أحرف على الأقل'],
    maxlength: [50, 'اسم المتجر يجب ألا يتجاوز 50 حرفًا']
  },
  storeLink: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^[a-zA-Z0-9_-]+$/, 'رابط المتجر يجب أن يحتوي فقط على حروف، أرقام، - أو _']
  },
  templateId: { 
    type: Number, 
    required: true, 
    enum: [1, 2, 3, 4, 5], // قوالب المتجر (1 إلى 5)
    default: 1 
  },
  primaryColor: { 
    type: String, 
    default: '#000000', // لون افتراضي (أسود)
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'اللون يجب أن يكون بتنسيق HEX']
  },
  secondaryColor: { 
    type: String, 
    default: '#ffffff', // لون افتراضي (أبيض)
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'اللون يجب أن يكون بتنسيق HEX']
  },
  headerHtml: { 
    type: String, 
    trim: true, 
    default: '' // كود HTML مخصص للهيدر
  },
  landingTemplateId: { 
    type: Number, 
    enum: [1, 2, 3, 4, 5], // قوالب اللاندينج بيج
    default: 1 
  },
  landingHtml: { 
    type: String, 
    trim: true, 
    default: '' // كود HTML مخصص للاندينج بيج
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// توليد storeLink قبل التحقق (Validation)
storeSchema.pre('validate', function (next) {
  if (!this.storeName) {
    return next(new Error('اسم المتجر مطلوب لتوليد الرابط'));
  }
  // إزالة التحقق من طول storeLink لأن storeController.js بيضمن رابط صالح
  this.updatedAt = Date.now();
  next();
});

// فهرس لتحسين البحث
storeSchema.index({ userId: 1 });
storeSchema.index({ storeLink: 1 });

module.exports = mongoose.model('Store', storeSchema);
