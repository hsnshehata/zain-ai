const mongoose = require('mongoose');

const chatOrderItemSchema = new mongoose.Schema({
  title: { type: String, trim: true, default: '' },
  quantity: { type: Number, min: 1, default: 1 },
  price: { type: Number, min: 0, default: 0 },
  currency: { type: String, trim: true, default: 'EGP' },
  note: { type: String, trim: true, default: '' }
}, { _id: false });

const chatOrderHistorySchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'], required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  note: { type: String, trim: true, default: '' },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const chatOrderSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  channel: { type: String, enum: ['facebook', 'instagram', 'whatsapp', 'web'], required: true },
  sourceUserId: { type: String, trim: true, required: true },
  sourceUsername: { type: String, trim: true, default: '' },
  customerName: { type: String, trim: true, default: '' },
  customerPhone: { type: String, trim: true, default: '' },
  customerEmail: { type: String, trim: true, default: '' },
  customerAddress: { type: String, trim: true, default: '' },
  customerNote: { type: String, trim: true, default: '' },
  items: { type: [chatOrderItemSchema], default: [] },
  freeText: { type: String, trim: true, default: '' },
  deliveryFee: { type: Number, min: 0, default: 0 },
  totalAmount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  history: { type: [chatOrderHistorySchema], default: [] },
  lastMessageId: { type: String, trim: true, default: '' },
  lastModifiedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.lastModifiedAt = this.updatedAt;
  next();
});

chatOrderSchema.index({ botId: 1, status: 1, createdAt: -1 });
chatOrderSchema.index({ conversationId: 1 });
chatOrderSchema.index({ channel: 1 });
chatOrderSchema.index({ lastModifiedAt: -1 });

module.exports = mongoose.models.ChatOrder || mongoose.model('ChatOrder', chatOrderSchema);
