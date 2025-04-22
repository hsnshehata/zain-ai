const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  userId: { type: String, required: true },
  messageId: { type: String, required: true },
  feedback: { type: String, enum: ['positive', 'negative'], required: true },
  messageContent: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  isVisible: { type: Boolean, default: true }, // حقل جديد لتحديد إذا كان التقييم مرئي أم لا
});

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
