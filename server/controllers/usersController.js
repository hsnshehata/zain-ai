const bcrypt = require('bcryptjs');
const User = require('../models/User');

// جلب كل المستخدمين
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('bots');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ خطأ في جلب المستخدمين:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إنشاء مستخدم جديد
exports.createUser = async (req, res) => {
  const { username, password, confirmPassword, role } = req.body;

  if (!username || !password || !confirmPassword || !role) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'كلمات المرور غير متطابقة' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    console.error('❌ خطأ في إنشاء المستخدم:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعديل مستخدم
exports.updateUser = async (req, res) => {
  const { username, role } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    user.username = username || user.username;
    user.role = role || user.role;

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
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    await User.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف المستخدم:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
