// /server/models/Store.js
const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  // صاحب المتجر (اختياري) — سيتم ملؤه من بيانات البوت لو الربط بالبِت مطلوب
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  // ربط المتجر بالبوت بدل الاعتماد فقط على المستخدم
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: false },
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
  whatsapp: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  website: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  mobilePhone: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  landline: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  email: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  address: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  googleMapsLink: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  footerText: { 
    type: String, 
    trim: true, 
    default: '' // نص اختياري أسفل الصفحة
  },
  isActive: { type: Boolean, default: true },
  adminConfig: {
    enableCart: { type: Boolean, default: true },
    landingLayout: { type: String, enum: ['layout1','layout2','layout3','layout4'], default: 'layout1' },
    showManagerPanel: { type: Boolean, default: true },
    // إعدادات بنر إعلاني أسفل الهيدر
    banner: {
      enabled: { type: Boolean, default: false },
      imageUrl: { type: String, default: '' },
      linkType: { type: String, enum: ['none','external','product'], default: 'none' },
      externalUrl: { type: String, default: '' },
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false }
    },
    // زر قسم خارجي بجوار الأقسام
    extraSection: {
      enabled: { type: Boolean, default: false },
      label: { type: String, default: '' },
      url: { type: String, default: '' }
    },
    // زر الدعم العائم (يربط صفحة الدردشة)
    supportWidget: {
      enabled: { type: Boolean, default: false },
      chatLink: { type: String, default: '' }
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  storeDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'وصف المتجر يجب ألا يتجاوز 500 حرف']
  },
  storeLogoUrl: {
    type: String,
    trim: true,
    default: ''
  },
  // روابط التواصل الاجتماعي
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
    youtube: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  }
});

// توليد storeLink قبل التحقق (Validation)
storeSchema.pre('validate', function (next) {
  if (!this.storeName) {
    return next(new Error('اسم المتجر مطلوب لتوليد الرابط'));
  }
  this.updatedAt = Date.now();
  next();
});

// فهرس لتحسين البحث
storeSchema.index({ userId: 1 });
storeSchema.index({ botId: 1 });

module.exports = mongoose.model('Store', storeSchema);
