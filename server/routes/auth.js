const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bot = require('../models/Bot');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// إعداد Nodemailer لإرسال ايميلات التفعيل
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// مسار التسجيل
router.post('/register', async (req, res) => {
  const { email, username, password, confirmPassword, botName, whatsapp } = req.body;
  if (!email || !username || !password || !confirmPassword || !botName) {
    console.log('❌ Registration failed: Required fields missing', { email, username, password, botName, whatsapp });
    return res.status(400).json({ message: 'جميع الحقول مطلوبة ما عدا رقم الواتساب', success: false });
  }
  if (password !== confirmPassword) {
    console.log('❌ Registration failed: Passwords do not match', { username });
    return res.status(400).json({ message: 'كلمات المرور غير متطابقة', success: false });
  }
  if (password.length < 6) {
    console.log('❌ Registration failed: Password too short', { username });
    return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', success: false });
  }
  if (email.endsWith('@gmail.com')) {
    console.log(`❌ Registration failed: Gmail email ${email} used in regular registration`);
    return res.status(400).json({ message: 'يرجى استخدام زرار تسجيل الدخول بجوجل لبريد Gmail', success: false });
  }
  try {
    const normalizedUsername = username.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      console.log(`❌ Registration failed: Invalid username ${normalizedUsername}`);
      return res.status(400).json({ message: 'اسم المستخدم يجب أن يحتوي على حروف إنجليزية، أرقام، _ أو - فقط', success: false });
    }
    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      console.log(`❌ Registration failed: Username length invalid ${normalizedUsername}`);
      return res.status(400).json({ message: 'اسم المستخدم يجب أن يكون بين 3 و20 حرفًا', success: false });
    }
    const existingUser = await User.findOne({ $or: [{ username: normalizedUsername }, { email }] });
    if (existingUser) {
      console.log(`❌ Registration failed: Username ${normalizedUsername} or email ${email} already exists`);
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل', success: false });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      username: normalizedUsername,
      password: hashedPassword,
      whatsapp: whatsapp || null,
      role: 'user',
      isVerified: false,
    });
    await user.save();

    // إنشاء توكن تفعيل
    const token = jwt.sign(
      { userId: user._id, botName },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    // إرسال ايميل تفعيل
    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${token}`;
    await transporter.sendMail({
      to: email,
      subject: 'تفعيل حسابك في زين بوت',
      html: `
        <p>مرحبًا ${username}،</p>
        <p>شكرًا لتسجيلك معنا في زين بوت! نحن متحمسون جدًا لوجودك معنا.</p>
        <p>يرجى النقر على الرابط التالي لتفعيل حسابك:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>نتمنى لك تجربة ممتعة مليئة بالإنجازات مع بوتاتنا الذكية!</p>
        <p>إذا كنت بحاجة إلى أي مساعدة، لا تتردد في التواصل مع فريق الدعم الخاص بنا.</p>
        <p>مع أطيب التحيات،<br>فريق زين بوت</p>
      `,
    });

    console.log(`✅ Verification email sent to ${email}`);
    res.status(201).json({ message: 'تم إرسال رابط تفعيل إلى بريدك الإلكتروني', success: true });
  } catch (err) {
    console.error('❌ خطأ في التسجيل:', { error: err.message, stack: err.stack, requestBody: req.body });
    res.status(500).json({ message: 'خطأ في السيرفر، حاول مرة أخرى', success: false });
  }
});

// مسار تفعيل الحساب
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log(`❌ Verification failed: User not found for ID ${decoded.userId}`);
      return res.status(404).json({ message: 'المستخدم غير موجود', success: false });
    }
    if (user.isVerified) {
      console.log(`❌ Verification failed: User ${user.username} already verified`);
      return res.status(400).json({ message: 'الحساب مفعل بالفعل', success: false });
    }
    user.isVerified = true;
    await user.save();

    // إنشاء البوت تلقائيًا
    const bot = new Bot({
      name: decoded.botName,
      userId: user._id,
    });
    await bot.save();

    // ربط البوت بالمستخدم
    user.bots.push(bot._id);
    await user.save();

    // إنشاء توكن تسجيل دخول
    const authToken = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '30d' }
    );

    console.log(`✅ Account verified and bot created for user ${user.username}, token valid for 30 days`);
    res.redirect(`/dashboard_new.html?token=${authToken}`);
  } catch (err) {
    console.error('❌ خطأ في تفعيل الحساب:', { error: err.message, stack: err.stack, token });
    res.status(500).json({ message: 'خطأ في السيرفر أو رابط تفعيل غير صالح', success: false });
  }
});

// مسار تسجيل الدخول
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    console.log('❌ Login failed: Username and password are required');
    return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان', success: false });
  }
  try {
    const normalizedUsername = username.toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      console.log(`❌ Login failed: Username ${normalizedUsername} not found`);
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }
    if (!user.isVerified) {
      console.log(`❌ Login failed: Account for ${normalizedUsername} not verified`);
      return res.status(400).json({ message: 'الحساب غير مفعل، تحقق من بريدك الإلكتروني', success: false });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Login failed: Incorrect password for username ${normalizedUsername}`);
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '30d' }
    );
    console.log(`✅ Login successful for username ${normalizedUsername}, token valid for 30 days`);
    res.status(200).json({ token, role: user.role, userId: user._id, username: user.username, success: true });
  } catch (err) {
    console.error('❌ خطأ في تسجيل الدخول:', { error: err.message, stack: err.stack, requestBody: req.body });
    res.status(500).json({ message: 'خطأ في السيرفر، حاول مرة أخرى', success: false });
  }
});

// مسار تسجيل الخروج
router.post('/logout', (req, res) => {
  const { username } = req.body;
  if (!username) {
    console.log('❌ Logout failed: Username is required');
    return res.status(400).json({ message: 'اسم المستخدم مطلوب', success: false });
  }
  console.log(`✅ User ${username} logged out successfully`);
  res.status(200).json({ message: 'تم تسجيل الخروج بنجاح', success: true });
});

// مسار تسجيل الدخول عبر جوجل
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
      const token = jwt.sign(
        { userId: user._id, role: user.role, username: user.username },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '30d' }
      );
      console.log(`✅ Google login successful for email ${email}, token valid for 30 days`);
      res.json({ token, role: user.role, userId: user._id, username: user.username, newUser: false, success: true });
    } else {
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        console.log(`❌ Google login failed: Email ${email} already registered`);
        return res.status(400).json({ message: 'البريد الإلكتروني مسجل بالفعل', success: false });
      }
      let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      if (username.length < 3 || username.length > 20) {
        username = `user_${googleId.slice(0, 8)}`.toLowerCase();
      }
      let count = 1;
      while (await User.findOne({ username })) {
        username = `${email.split('@')[0]}${count}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        if (username.length < 3 || username.length > 20) {
          username = `user_${googleId.slice(0, 8)}${count}`.toLowerCase();
        }
        count++;
      }
      user = new User({
        email,
        username,
        whatsapp: null,
        googleId,
        role: 'user',
        isVerified: true,
      });
      await user.save();

      // إنشاء بوت تلقائي
      const bot = new Bot({
        name: 'بوت افتراضي',
        userId: user._id,
      });
      await bot.save();

      user.bots.push(bot._id);
      await user.save();

      const token = jwt.sign(
        { userId: user._id, role: user.role, username: user.username },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '30d' }
      );
      console.log(`✅ Google registration successful for email ${email}, username ${username}, token valid for 30 days`);
      res.json({ token, role: user.role, userId: user._id, username: user.username, newUser: true, success: true });
    }
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول بجوجل:', { error: error.message, stack: error.stack, requestBody: req.body });
    res.status(401).json({ message: 'فشل في التحقق من بيانات جوجل، حاول مرة أخرى', success: false });
  }
});

module.exports = router;
