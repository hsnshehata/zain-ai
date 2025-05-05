const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // التحقق من وجود المستخدم
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`❌ Login failed: Username ${username} not found`);
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Login failed: Incorrect password for username ${username}`);
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }

    // إنشاء توكن
    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    console.log(`✅ Login successful for username ${username}`);
    res.status(200).json({ token, role: user.role, userId: user._id, username: user.username, success: true });
  } catch (err) {
    console.error('❌ خطأ في تسجيل الدخول:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر، حاول مرة أخرى', success: false });
  }
});

router.post('/logout', (req, res) => {
  const { username } = req.body;

  if (!username) {
    console.log('❌ Logout failed: Username is required');
    return res.status(400).json({ message: 'اسم المستخدم مطلوب', success: false });
  }

  console.log(`✅ User ${username} logged out successfully`);
  res.status(200).json({ message: 'تم تسجيل الخروج بنجاح', success: true });
});

router.post('/register', async (req, res) => {
  const { email, username, password, confirmPassword, whatsapp } = req.body;
  if (!email || !username || !password || !confirmPassword || !whatsapp) {
    console.log('❌ Registration failed: All fields are required', { email, username, password, confirmPassword, whatsapp });
    return res.status(400).json({ message: 'جميع الحقول مطلوبة', success: false });
  }
  if (password !== confirmPassword) {
    console.log('❌ Registration failed: Passwords do not match');
    return res.status(400).json({ message: 'كلمات المرور غير متطابقة', success: false });
  }
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log(`❌ Registration failed: Username ${username} or email ${email} already exists`);
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل', success: false });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      username,
      password: hashedPassword,
      whatsapp,
      role: 'user',
    });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
    console.log(`✅ Registration successful for username ${username}`);
    res.status(201).json({ token, role: user.role, id: user._id, username: user.username, success: true });
  } catch (err) {
    console.error('❌ خطأ في التسجيل:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر', success: false });
  }
});

router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('❌ Google login failed: GOOGLE_CLIENT_ID not set');
      return res.status(500).json({ message: 'خطأ في إعدادات السيرفر، يرجى التواصل مع الدعم', success: false });
    }

    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    let user = await User.findOne({ googleId });
    if (user) {
      const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
      console.log(`✅ Google login successful for email ${email}`);
      res.json({ token, role: user.role, id: user._id, username: user.username, newUser: false, success: true });
    } else {
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        console.log(`❌ Google login failed: Email ${email} already registered`);
        return res.status(400).json({ message: 'البريد الإلكتروني مسجل بالفعل', success: false });
      }
      let username = payload['given_name'] + '_' + payload['family_name'];
      username = username.toLowerCase().replace(/\s/g, '_');
      let count = 1;
      while (await User.findOne({ username })) {
        username = `${payload['given_name']}_${payload['family_name']}${count}`;
        count++;
      }
      const password = crypto.randomBytes(6).toString('hex');
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        email,
        username,
        password: hashedPassword,
        googleId,
        role: 'user',
      });
      await user.save();
      const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
      console.log(`✅ Google registration successful for email ${email}, username ${username}`);
      res.json({ token, role: user.role, id: user._id, username: user.username, newUser: true, success: true });
    }
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول بجوجل:', error.message, error.stack);
    res.status(401).json({ message: 'فشل في التحقق من بيانات جوجل، حاول مرة أخرى', success: false });
  }
});

module.exports = router;
