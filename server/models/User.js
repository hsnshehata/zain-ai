// /server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    match: /^[a-z0-9_-]+$/ // شرط الـ username
  },
  password: { type: String, required: false },
  role: { type: String, enum: ['user', 'superadmin'], default: 'user' },
  bots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }],
  createdAt: { type: Date, default: Date.now },
  email: { type: String, unique: true, required: true },
  whatsapp: { type: String, required: false }, // اختياري
  googleId: { type: String },
  isVerified: { type: Boolean, default: false },
  subscriptionType: { type: String, enum: ['free', 'monthly', 'yearly'], default: 'free' },
  subscriptionEndDate: { type: Date },
  // تكامل تيليجرام
  telegramUserId: { type: String, unique: true, sparse: true, default: null },
  telegramUsername: { type: String, default: '' },
  telegramLinkCode: { type: String, default: '' },
  telegramLinkExpiresAt: { type: Date, default: null },
  telegramNotifications: {
    newOrder: { type: Boolean, default: true },
    orderStatus: { type: Boolean, default: true },
    chatOrder: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: false },
  },
  telegramLanguage: { type: String, enum: ['ar', 'en'], default: 'ar' }
});

module.exports = mongoose.model('User', userSchema);
