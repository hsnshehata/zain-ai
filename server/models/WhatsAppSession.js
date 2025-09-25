const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  connected: { type: Boolean, default: false },
  startTime: { type: Date },
  sessionData: { type: mongoose.Schema.Types.Mixed }, // لحفظ بيانات الجلسة
});

module.exports = mongoose.model('WhatsAppSession', whatsappSessionSchema);
