const mongoose = require('mongoose');

const chatPageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  linkId: { type: String, required: true, unique: true }, // معرّف فريد للرابط
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatPage', chatPageSchema);
