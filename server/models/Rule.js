const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  type: { type: String, enum: ['global', 'general', 'products', 'qa'], required: true },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Rule', ruleSchema);
