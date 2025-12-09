const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  userId: { type: String, required: true }, // معرف المستخدم (فيسبوك أو ويب)
  messageId: { type: String, required: true }, // معرف رد البوت (mid)
  type: { type: String, enum: ['like', 'dislike'], required: true }, // نوع التقييم
  messageContent: { type: String, required: true }, // محتوى رد البوت
  userMessage: { type: String, required: true }, // رسالة المستخدم اللي البوت رد عليها
  timestamp: { type: Date, default: Date.now }, // تاريخ التقييم
  isVisible: { type: Boolean, default: true } // حالة الظهور
});

// ضمان إن كل مستخدم يقيم نفس الرسالة مرة واحدة بس
feedbackSchema.index({ userId: 1, messageId: 1 }, { unique: true });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
