const User = require('../models/User');
const bcrypt = require('bcryptjs');

// جلب كل المستخدمين
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ خطأ في جلب المستخدمين:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إنشاء مستخدم جديد (للسوبر أدمن)
exports.createUser = async (req, res) => {
  const { username, password, role, email, whatsapp } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role, email, whatsapp, isVerified: true });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error('❌ خطأ في إنشاء المستخدم:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعديل مستخدم
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    if (req.body.whatsapp) user.whatsapp = req.body.whatsapp;
    if (req.body.role) user.role = req.body.role;
    await user.save();
    res.status(200).json(user);
  } catch (err) {
    console.error('❌ خطأ في تعديل المستخدم:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// حذف مستخدم
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف المستخدم:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
