const mongoose = require('mongoose');

const chatCustomerSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
  channel: { type: String, enum: ['facebook', 'instagram', 'whatsapp', 'web', 'telegram'], required: true },
  sourceUserId: { type: String, required: true, trim: true },
  sourceUsername: { type: String, trim: true, default: '' },
  name: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  lastOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatOrder', default: null },
  lastOrderAt: { type: Date, default: null },
  lastMessageId: { type: String, trim: true, default: '' },
  lastMessageAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatCustomerSchema.index({ botId: 1, sourceUserId: 1 }, { unique: true });
chatCustomerSchema.index({ botId: 1, phone: 1 }, { unique: true, sparse: true });
chatCustomerSchema.index({ updatedAt: -1 });

chatCustomerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (!this.createdAt) this.createdAt = this.updatedAt;
  next();
});

module.exports = mongoose.models.ChatCustomer || mongoose.model('ChatCustomer', chatCustomerSchema);
