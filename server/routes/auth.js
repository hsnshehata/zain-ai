const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// تسجيل الدخول
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // التحقق من وجود المستخدم
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // إنشاء توكن
    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.status(200).json({ token, role: user.role, userId: user._id, username: user.username, success: true });
  } catch (err) {
    console.error('❌ خطأ في تسجيل الدخول:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// تسجيل الخروج
router.post('/logout', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'اسم المستخدم مطلوب', success: false });
  }

  // هنا ممكن تضيف أي منطق إضافي لتسجيل الخروج (مثل إبطال التوكن إذا كنت بتستخدم blacklist)
  console.log(`✅ User ${username} logged out successfully`);
  res.status(200).json({ message: 'تم تسجيل الخروج بنجاح', success: true });
});

module.exports = router;
