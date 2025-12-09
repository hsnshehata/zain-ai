const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // a stable internal identifier (some existing DBs may have a unique index on this)
  employeeId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(), index: true, unique: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  name: { type: String, trim: true, required: true },
  username: { type: String, trim: true, lowercase: true },
  password: { type: String },
  phone: { type: String, trim: true },
  idImageUrl: { type: String, default: '' },
  salary: { type: Number, default: 0 },
  permissions: { type: Object, default: {} },
  advancesBalance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employee', employeeSchema);
