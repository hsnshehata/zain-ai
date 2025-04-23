const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  type: { type: String, required: true, enum: ['general', 'products', 'qa', 'global', 'api'] },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

// إضافة فهرس لتحسين الأداء
ruleSchema.index({ botId: 1, type: 1 });
ruleSchema.index({ createdAt: -1 }); // فهرس للترتيب التنازلي حسب تاريخ الإنشاء

module.exports = mongoose.model('Rule', ruleSchema);
