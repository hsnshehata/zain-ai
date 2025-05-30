// server/models/Bot.js
const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facebookApiKey: { type: String, trim: true },
  facebookPageId: { type: String, trim: true },
  instagramApiKey: { type: String, trim: true },
  instagramPageId: { type: String, trim: true },
  // إضافة حقول واتساب
  whatsappBusinessAccountId: { type: String, trim: true },
  whatsappApiKey: { type: String, trim: true },
  lastWhatsappTokenRefresh: { type: Date },
  isActive: { type: Boolean, default: true },
  autoStopDate: { type: Date },
  subscriptionType: { type: String, enum: ['free', 'monthly', 'yearly'], default: 'free' },
  welcomeMessage: { type: String, trim: true },
  // إعدادات Webhook لفيسبوك
  messagingOptinsEnabled: { type: Boolean, default: true },
  messageReactionsEnabled: { type: Boolean, default: true },
  messagingReferralsEnabled: { type: Boolean, default: true },
  messageEditsEnabled: { type: Boolean, default: true },
  inboxLabelsEnabled: { type: Boolean, default: true },
  commentsRepliesEnabled: { type: Boolean, default: true },
  // إعدادات Webhook لإنستجرام
  instagramMessagingOptinsEnabled: { type: Boolean, default: true },
  instagramMessageReactionsEnabled: { type: Boolean, default: true },
  instagramMessagingReferralsEnabled: { type: Boolean, default: true },
  instagramMessageEditsEnabled: { type: Boolean, default: true },
  instagramInboxLabelsEnabled: { type: Boolean, default: true },
  instagramCommentsRepliesEnabled: { type: Boolean, default: true },
  // إعدادات Webhook لواتساب
  whatsappMessagingOptinsEnabled: { type: Boolean, default: true },
  whatsappMessageReactionsEnabled: { type: Boolean, default: true },
  whatsappMessagingReferralsEnabled: { type: Boolean, default: true },
  whatsappMessageEditsEnabled: { type: Boolean, default: true },
  // إعدادات الرسالة التلقائية لفيسبوك
  facebookAutoMessageEnabled: { type: Boolean, default: false },
  facebookAutoMessageText: { type: String, trim: true, maxlength: 200 },
  facebookAutoMessageImage: { type: String, trim: true },
  facebookAutoMessageDelay: { type: Number, default: 600000 }, // 10 دقايق بالمللي ثانية
  // إعدادات الرسالة التلقائية لإنستجرام
  instagramAutoMessageEnabled: { type: Boolean, default: false },
  instagramAutoMessageText: { type: String, trim: true, maxlength: 200 },
  instagramAutoMessageImage: { type: String, trim: true },
  instagramAutoMessageDelay: { type: Number, default: 600000 }, // 10 دقايق بالمللي ثانية
  // تواريخ الربط
  lastFacebookTokenRefresh: { type: Date },
  lastInstagramTokenRefresh: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bot', botSchema);
