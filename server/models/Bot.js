const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facebookApiKey: { type: String },
  facebookPageId: { type: String },
  createdAt: { type: Date, default: Date.now },
  messagingOptinsEnabled: { type: Boolean, default: false },
  messageReactionsEnabled: { type: Boolean, default: false },
  messagingReferralsEnabled: { type: Boolean, default: false },
  messageEditsEnabled: { type: Boolean, default: false },
  inboxLabelsEnabled: { type: Boolean, default: false },
  workingHours: {
    start: { type: String, default: '09:00' }, // ساعة البداية (بتوقيت 24 ساعة)
    end: { type: String, default: '17:00' },   // ساعة النهاية (بتوقيت 24 ساعة)
  },
  isActive: { type: Boolean, default: true }, // حالة تشغيل البوت
  autoStopDate: { type: Date }, // تاريخ الإيقاف التلقائي
  subscriptionType: { type: String, enum: ['free', 'monthly', 'yearly'], default: 'free' }, // نوع الاشتراك
  welcomeMessage: { type: String } // رسالة الترحيب (اختياري)
});

module.exports = mongoose.model('Bot', botSchema);
