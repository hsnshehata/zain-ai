const mongoose = require('mongoose');

const chatPageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  linkId: { type: String, required: true, unique: true },
  title: { type: String, default: 'صفحة دردشة' },
  titleColor: { type: String, default: '#ffffff' },
  colors: {
    header: { type: String, default: '#007bff' },
    background: { type: String, default: '#f8f9fa' },
    text: { type: String, default: '#333333' },
    button: { type: String, default: '#007bff' }, // لون الأزرار المقترحة
    botMessageBackground: { type: String, default: '#e9ecef' },
    userMessageBackground: { type: String, default: '#007bff' },
    chatAreaBackground: { type: String, default: '#ffffff' },
    inputTextColor: { type: String, default: '#333333' },
    userMessageTextColor: { type: String, default: '#ffffff' },
    botMessageTextColor: { type: String, default: '#000000' },
    sendButtonColor: { type: String, default: '#007bff' }, // لون زر الإرسال
    mainBackgroundColor: { type: String, default: '#ffffff' }, // لون خلفية الصفحة الرئيسية
  },
  logoUrl: { type: String },
  logoDeleteUrl: { type: String },
  suggestedQuestionsEnabled: { type: Boolean, default: false },
  suggestedQuestions: [{ type: String }],
  imageUploadEnabled: { type: Boolean, default: false },
  transparentBackgroundEnabled: { type: Boolean, default: false }, // حالة الشفافية
  backgroundTransparency: { type: Number, default: 0.5, min: 0, max: 1 }, // نسبة الشفافية (من 0 لـ 1)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatPage', chatPageSchema);
