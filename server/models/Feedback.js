const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  userId: { type: String, required: true }, // Facebook user ID or web chat user ID
  messageId: { type: String, required: true }, // Message ID (mid from Facebook or custom ID for web)
  feedback: { type: String, enum: ['positive', 'negative'], required: true }, // "positive" or "negative"
  messageContent: { type: String, required: true }, // The message content being rated
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
