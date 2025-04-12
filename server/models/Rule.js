const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  type: { type: String, required: true, enum: ['general', 'products', 'qa', 'global'] },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.model('Rule', ruleSchema);
