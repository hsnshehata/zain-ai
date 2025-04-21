const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  userId: { type: String, required: true },
  messageId: { type: String, required: true },
  feedback: { type: String, enum: ['positive', 'negative'], required: true },
  messageContent: { type: String, required: false }, // Changed to optional
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
