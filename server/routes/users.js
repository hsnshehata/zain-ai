// /server/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bot = require('../models/Bot');
const authenticate = require('../middleware/authenticate');
const bcrypt = require('bcryptjs');

// Get current user data
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log(`❌ User not found for userId: ${req.user.userId}`);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    console.log(`✅ User data fetched for userId: ${req.user.userId}`);
    res.status(200).json({
      email: user.email,
      username: user.username,
      whatsapp: user.whatsapp,
      role: user.role
    });
  } catch (err) {
    console.error('❌ Error fetching user data:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Get all users (Superadmin only)
router.get('/', authenticate, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  try {
    const populateBots = req.query.populate === 'bots';
    const users = await (populateBots ? User.find().populate('bots') : User.find());
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Create a new user (Superadmin only)
router.post('/', authenticate, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  const { username, password, confirmPassword, role, email } = req.body;
  if (!username || !password || !confirmPassword || !role || !email) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'كلمات المرور غير متطابقة' });
  }
  try {
    const normalizedUsername = username.toLowerCase(); // تحويل الـ username للحروف الصغيرة
    const existingUser = await User.findOne({ $or: [{ username: normalizedUsername }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username: normalizedUsername, password: hashedPassword, role, email });
    await user.save();
    res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Update a user (Superadmin can update any user, regular user can update themselves)
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { username, password, role, email, whatsapp } = req.body;

  if (req.user.role !== 'superadmin' && id !== req.user.userId) {
    return res.status(403).json({ message: 'غير مصرح لك' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const normalizedUsername = username ? username.toLowerCase() : user.username; // تحويل الـ username للحروف الصغيرة
    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername, _id: { $ne: id } },
        { email: email || user.email, _id: { $ne: id } }
      ]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }

    user.username = normalizedUsername;
    user.email = email || user.email;
    user.whatsapp = whatsapp || user.whatsapp;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (req.user.role === 'superadmin') {
      user.role = role || user.role;
    }

    await user.save();
    res.status(200).json({ message: 'تم تحديث المستخدم بنجاح' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Delete a user (Superadmin only)
router.delete('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'لا يمكن حذف حساب مدير عام' });
    }
    await Bot.deleteMany({ userId: id });
    await user.deleteOne();
    res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
