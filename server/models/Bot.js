const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facebookApiKey: { type: String, trim: true },
  facebookPageId: { type: String, trim: true },
  instagramApiKey: { type: String, trim: true },
  instagramPageId: { type: String, trim: true },
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
  instagramMessagingOptinsEnabled: { type: Boolean, default: true },
  instagramMessageReactionsEnabled: { type: Boolean, default: true },
  instagramMessagingReferralsEnabled: { type: Boolean, default: true },
  instagramMessageEditsEnabled: { type: Boolean, default: true },
  instagramInboxLabelsEnabled: { type: Boolean, default: true },
  instagramCommentsRepliesEnabled: { type: Boolean, default: true },
  lastInstagramTokenRefresh: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bot', botSchema);
