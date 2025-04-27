// /server/models/Rule.js

const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  type: { type: String, required: true, enum: ['general', 'products', 'qa', 'global', 'api'] },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 } // حقل جديد لتتبع عدد مرات الاستخدام
});

// إضافة فهرس لتحسين الأداء
ruleSchema.index({ botId: 1, type: 1 });
ruleSchema.index({ createdAt: -1 }); // فهرس للترتيب التنازلي حسب تاريخ الإنشاء
ruleSchema.index({ usageCount: -1 }); // فهرس جديد لتسريع الفرز حسب عدد الاستخدامات

module.exports = mongoose.model('Rule', ruleSchema);
