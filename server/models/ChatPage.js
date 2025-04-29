const mongoose = require('mongoose');

const chatPageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  linkId: { type: String, required: true, unique: true },
  title: { type: String, default: 'صفحة دردشة' },
  titleColor: { type: String, default: '#ffffff' },
  colors: {
    header: { type: String, default: '#007bff' },
    inputAreaBackground: { type: String, default: '#f8f9fa' },
    text: { type: String, default: '#333333' },
    button: { type: String, default: '#007bff' },
    botMessageBackground: { type: String, default: '#e9ecef' },
    userMessageBackground: { type: String, default: '#007bff' },
    chatAreaBackground: { type: String, default: '#ffffff' },
    inputTextColor: { type: String, default: '#333333' },
    userMessageTextColor: { type: String, default: '#ffffff' },
    botMessageTextColor: { type: String, default: '#000000' },
    sendButtonColor: { type: String, default: '#007bff' },
    containerBackgroundColor: { type: String, default: '#ffffff' },
    outerBackgroundColor: { type: String, default: '#000000' },
  },
  logoUrl: { type: String },
  logoDeleteUrl: { type: String },
  suggestedQuestionsEnabled: { type: Boolean, default: false },
  suggestedQuestions: [{ type: String }],
  imageUploadEnabled: { type: Boolean, default: false },
  headerHidden: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatPage', chatPageSchema);
