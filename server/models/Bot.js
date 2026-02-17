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

  // إعدادات الرد على التعليقات (جديد)
  commentReplyMode: {
    type: String,
    enum: ['ai', 'keyword', 'private'],
    default: 'ai'
  },
  commentKeywords: [{
    keywords: [String], // مصفوفة كلمات مفتاحية
    reply: String,      // الرد المرتبط بها
    matchType: { type: String, enum: ['exact', 'partial'], default: 'partial' }
  }],
  commentDefaultReply: { type: String, trim: true }, // الرد الافتراضي في وضع الكلمات المفتاحية
  privateReplyMessage: { type: String, trim: true, default: 'تم إرسال التفاصيل على الخاص' }, // الرد العام في وضع الرد الخاص

  // إعدادات إيقاف الردود بكلمة مفتاحية من المالك
  ownerPauseKeyword: { type: String, trim: true },
  ownerPauseDurationMinutes: { type: Number, default: 30 },
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
  // تواريخ الربط
  lastFacebookTokenRefresh: { type: Date }, // أضفنا الحقل هنا
  lastInstagramTokenRefresh: { type: Date },
  // إضافة حقل لربط المتجر (جديد)
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  // تكامل تيليجرام لكل بوت على حدة
  telegramUserId: { type: String, default: '', index: true },
  telegramUsername: { type: String, default: '' },
  telegramLinkCode: { type: String, default: '' },
  telegramLinkExpiresAt: { type: Date, default: null },
  telegramNotifications: {
    newOrder: { type: Boolean, default: true },
    orderStatus: { type: Boolean, default: true },
    chatOrder: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: false },
  },
  telegramLanguage: { type: String, enum: ['ar', 'en'], default: 'ar' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bot', botSchema);
