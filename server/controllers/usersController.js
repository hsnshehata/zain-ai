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

// جلب مستخدم معين بناءً على الـ ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('bots');
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('❌ خطأ في جلب المستخدم:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إنشاء مستخدم جديد
exports.createUser = async (req, res) => {
  const { username, email, password, confirmPassword, role, whatsapp, subscriptionType, subscriptionEndDate } = req.body;

  if (!username || !email || !password || !confirmPassword || !role) {
    return res.status(400).json({ message: 'جميع الحقول الأساسية مطلوبة' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'كلمات المرور غير متطابقة' });
  }

  if (subscriptionType && !['free', 'monthly', 'yearly'].includes(subscriptionType)) {
    return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      email, 
      password: hashedPassword, 
      role, 
      whatsapp, 
      isVerified: true,
      subscriptionType: subscriptionType || 'free',
      subscriptionEndDate: subscriptionEndDate || null
    });
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

    // تحقق إن المستخدم اللي بيعمل التحديث هو نفسه أو أدمن
    if (req.user.id !== req.params.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'غير مصرح لك' });
    }

    if (req.body.username) {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
      }
      user.username = req.body.username;
    }
    if (req.body.email) {
      const existingEmail = await User.findOne({ email: req.body.email });
      if (existingEmail && existingEmail._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'البريد الإلكتروني موجود بالفعل' });
      }
      user.email = req.body.email;
    }
    if (req.body.role && req.user.role === 'superadmin') {
      user.role = req.body.role;
    }
    if (req.body.whatsapp) {
      user.whatsapp = req.body.whatsapp;
    }
    if (req.body.subscriptionType && req.user.role === 'superadmin') {
      if (!['free', 'monthly', 'yearly'].includes(req.body.subscriptionType)) {
        return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
      }
      user.subscriptionType = req.body.subscriptionType;
    }
    if (req.body.subscriptionEndDate && req.user.role === 'superadmin') {
      user.subscriptionEndDate = req.body.subscriptionEndDate || null;
    }

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
