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
  const { email, username, password, botName, whatsapp } = req.body;
  if (!email || !username || !password || !botName || !whatsapp) {
    console.log('❌ Registration failed: All fields are required', { email, username, password, botName, whatsapp });
    return res.status(400).json({ message: 'جميع الحقول مطلوبة', success: false });
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
    console.error('❌ خطأ في التسجيل:', err.message, err.stack);
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
      { expiresIn: '24h' }
    );

    console.log(`✅ Account verified and bot created for user ${user.username}`);
    res.redirect(`/dashboard_new.html?token=${authToken}`);
  } catch (err) {
    console.error('❌ خطأ في تفعيل الحساب:', err.message, err.stack);
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
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`❌ Login failed: Username ${username} not found`);
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }
    if (!user.isVerified) {
      console.log(`❌ Login failed: Account for ${username} not verified`);
      return res.status(400).json({ message: 'الحساب غير مفعل، تحقق من بريدك الإلكتروني', success: false });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Login failed: Incorrect password for username ${username}`);
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }
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
        { expiresIn: '24h' }
      );
      console.log(`✅ Google login successful for email ${email}`);
      res.json({ token, role: user.role, userId: user._id, username: user.username, newUser: false, success: true });
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
      user = new User({
        email,
        username,
        whatsapp: 'غير محدد', // يمكن طلب رقم واتساب لاحقًا
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
        { expiresIn: '24h' }
      );
      console.log(`✅ Google registration successful for email ${email}, username ${username}`);
      res.json({ token, role: user.role, userId: user._id, username: user.username, newUser: true, success: true });
    }
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول بجوجل:', error.message, error.stack);
    res.status(401).json({ message: 'فشل في التحقق من بيانات جوجل، حاول مرة أخرى', success: false });
  }
});

module.exports = router;
