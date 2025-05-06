const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bot = require('../models/Bot');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// إعداد Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// مسار التسجيل
router.post('/register', async (req, res) => {
  const { email, username, password, botName, whatsapp } = req.body;
  if (!email || !username || !password || !botName || !whatsapp) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      username,
      password: hashedPassword,
      whatsapp,
      role: 'user',
      isVerified: false,
    });
    await user.save();

    // إنشاء رمز تفعيل
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // إرسال رسالة تفعيل عبر البريد
    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${token}`;
    await transporter.sendMail({
      to: email,
      subject: 'تفعيل حسابك في زين بوت',
      html: `
        <p>مرحبًا ${username}،</p>
        <p>شكرًا لتسجيلك معنا في زين بوت! يرجى النقر على الرابط التالي لتفعيل حسابك:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>نتمنى لك تجربة ممتعة معنا!</p>
        <p>فريق زين بوت</p>
      `,
    });

    res.status(201).json({ message: 'تم إرسال رابط تفعيل إلى بريدك الإلكتروني' });
  } catch (err) {
    console.error('❌ خطأ في التسجيل:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// مسار تفعيل الحساب
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'الحساب مفعل بالفعل' });
    }
    user.isVerified = true;
    await user.save();

    // إنشاء البوت
    const bot = new Bot({ name: req.body.botName || 'بوت افتراضي', userId: user._id });
    await bot.save();

    const authToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ message: 'تم تفعيل الحساب بنجاح', token: authToken });
  } catch (err) {
    console.error('❌ خطأ في تفعيل الحساب:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أو رابط تفعيل غير صالح' });
  }
});

// مسار تسجيل الدخول عبر جوجل
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email;
    const googleId = payload.sub;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        username: payload.name,
        googleId,
        whatsapp: 'غير محدد', // يمكن طلب رقم واتساب لاحقًا
        role: 'user',
        isVerified: true,
      });
      await user.save();

      // إنشاء بوت افتراضي
      const bot = new Bot({ name: 'بوت افتراضي', userId: user._id });
      await bot.save();
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, role: user.role, userId: user._id, username: user.username });
  } catch (err) {
    console.error('❌ خطأ في تسجيل الدخول عبر جوجل:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// مسار تسجيل الدخول العادي
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    if (!user.isVerified) {
      return res.status(400).json({ message: 'الحساب غير مفعل، تحقق من بريدك الإلكتروني' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, role: user.role, userId: user._id, username: user.username });
  } catch (err) {
    console.error('❌ خطأ في تسجيل الدخول:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
