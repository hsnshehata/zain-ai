const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'superadmin'], default: 'user' },
  bots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }],
  createdAt: { type: Date, default: Date.now },
  email: { type: String, unique: true, required: false }, // غيرنا required لـ false
  whatsapp: { type: String },
  googleId: { type: String }
});

module.exports = mongoose.model('User', userSchema);
