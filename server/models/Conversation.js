// server/models/Conversation.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  messageId: { type: String }, // Unique message ID from webhook
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: "Bot", required: true },
  userId: { type: String, required: true }, // Facebook/Instagram user ID
  channel: { type: String, required: true, enum: ['web', 'facebook', 'instagram', 'whatsapp'] }, // القناة
  username: { type: String },
  messages: [messageSchema],
  lastAutoMessageSent: { type: Date }, // وقت آخر رسالة تلقائية
  labels: [{ type: String }], // لتخزين الملصقات
});

// إضافة Index على messages.timestamp لتسريع الـ Sort
conversationSchema.index({ "messages.timestamp": -1 });

// إضافة unique index على messageId داخل messages
conversationSchema.index({ "messages.messageId": 1 }, { unique: true, sparse: true });

// التأكد إن المودل ما يتعرفش أكتر من مرة
module.exports = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
