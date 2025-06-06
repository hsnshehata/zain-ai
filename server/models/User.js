// /server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    match: /^[a-z0-9_-]+$/ // شرط إن الـ username يكون حروف إنجليزي، أرقام، _ أو - فقط
  },
  password: { type: String, required: false },
  role: { type: String, enum: ['user', 'superadmin'], default: 'user' },
  bots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }],
  createdAt: { type: Date, default: Date.now },
  email: { type: String, unique: true, required: true },
  whatsapp: { type: String, required: false }, // غيرناه لاختياري
  googleId: { type: String },
  isVerified: { type: Boolean, default: false },
  subscriptionType: { type: String, enum: ['free', 'monthly', 'yearly'], default: 'free' },
  subscriptionEndDate: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
