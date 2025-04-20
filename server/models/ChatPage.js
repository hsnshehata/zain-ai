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
    button: { type: String, default: '#007bff' },
    botMessageBackground: { type: String, default: '#e9ecef' }, // New field for bot message background
    userMessageBackground: { type: String, default: '#007bff' }, // New field for user message background
    chatAreaBackground: { type: String, default: '#ffffff' }, // New field for chat area background
  },
  logoUrl: { type: String },
  suggestedQuestionsEnabled: { type: Boolean, default: false },
  suggestedQuestions: [{ type: String }],
  imageUploadEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatPage', chatPageSchema);
