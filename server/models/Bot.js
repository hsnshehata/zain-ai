const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facebookApiKey: { type: String, trim: true },
  facebookPageId: { type: String, trim: true },
  instagramApiKey: { type: String, trim: true }, // جديد
  instagramPageId: { type: String, trim: true }, // جديد
  isActive: { type: Boolean, default: true },
  autoStopDate: { type: Date },
  subscriptionType: { type: String, enum: ['free', 'monthly', 'yearly'], default: 'free' },
  welcomeMessage: { type: String, trim: true },
  messagingOptinsEnabled: { type: Boolean, default: true },
  messageReactionsEnabled: { type: Boolean, default: true },
  messagingReferralsEnabled: { type: Boolean, default: true },
  messageEditsEnabled: { type: Boolean, default: true },
  inboxLabelsEnabled: { type: Boolean, default: true },
  commentsRepliesEnabled: { type: Boolean, default: true },
  // ميزات إنستجرام الجديدة
  instagramMessagingOptinsEnabled: { type: Boolean, default: true }, // جديد
  instagramMessageReactionsEnabled: { type: Boolean, default: true }, // جديد
  instagramMessagingReferralsEnabled: { type: Boolean, default: true }, // جديد
  instagramMessageEditsEnabled: { type: Boolean, default: true }, // جديد
  instagramInboxLabelsEnabled: { type: Boolean, default: true }, // جديد
  instagramCommentsRepliesEnabled: { type: Boolean, default: true }, // جديد
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bot', botSchema);
