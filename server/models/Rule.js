// /server/models/Rule.js

const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }, // مش required لأن القواعد الموحدة مش هتحتاج botId
  type: { type: String, required: true, enum: ['general', 'products', 'qa', 'global', 'channels'] },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function (value) {
        // التأكد إن content مش null أو فاضي
        if (value === null) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true; // أي نوع تاني هيترجع true (مش هيحصل مشكلة)
      },
      message: 'المحتوى لا يمكن أن يكون فارغًا أو null أو كائنًا فارغًا'
    }
  },
  createdAt: { type: Date, default: Date.now },
});

// إضافة فهرس لتحسين الأداء
ruleSchema.index({ botId: 1, type: 1 });
ruleSchema.index({ createdAt: -1 }); // فهرس للترتيب التنازلي حسب تاريخ الإنشاء

module.exports = mongoose.model('Rule', ruleSchema);
