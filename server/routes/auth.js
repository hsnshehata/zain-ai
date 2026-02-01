const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bot = require('../models/Bot');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const { validateBody, Joi } = require('../middleware/validate');
const logger = require('../logger');
const { validatePasswordStrength } = require('../utils/passwordPolicy');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// مخططات التحقق من البيانات
const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  username: Joi.string().pattern(/^[a-z0-9_-]+$/).min(3).max(20).required(),
  password: Joi.string().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:"'<>,.?/]).{8,}$/).required()
    .messages({ 'string.pattern.base': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز' }),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'كلمات المرور غير متطابقة' }),
  botName: Joi.string().min(2).max(50).required(),
  whatsapp: Joi.string().allow(null, '').optional()
});

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().required(),
});

const googleSchema = Joi.object({
  idToken: Joi.string().required(),
});

// إعداد Nodemailer لإرسال ايميلات التفعيل
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// مسار التسجيل
router.post('/register', validateBody(registerSchema), async (req, res) => {
  const { email, username, password, confirmPassword, botName, whatsapp } = req.body;
  if (email.endsWith('@gmail.com')) {
    logger.warn('❌ Registration failed: Gmail used in regular registration', { email });
    return res.status(400).json({ message: 'يرجى استخدام زرار تسجيل الدخول بجوجل لبريد Gmail', success: false });
  }
  try {
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      logger.warn('registration_weak_password', { username, reasons: passwordCheck.errors });
      return res.status(400).json({ message: passwordCheck.errors.join(' | '), success: false });
    }

    const normalizedUsername = username.toLowerCase();
    const existingUser = await User.findOne({ $or: [{ username: normalizedUsername }, { email }] });
    if (existingUser) {
      logger.warn('❌ Registration failed: username or email exists', { username: normalizedUsername, email });
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

    logger.info('verification_email_sent', { email });
    res.status(201).json({ message: 'تم إرسال رابط تفعيل إلى بريدك الإلكتروني', success: true });
  } catch (err) {
    logger.error('❌ خطأ في التسجيل', { error: err.message, stack: err.stack, requestBody: req.body });
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
      logger.warn('❌ Verification failed: user not found', { userId: decoded.userId });
      return res.status(404).json({ message: 'المستخدم غير موجود', success: false });
    }
    if (user.isVerified) {
      logger.warn('❌ Verification failed: already verified', { userId: user._id, username: user.username });
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

    logger.info('account_verified', { userId: user._id, botId: bot._id });
    res.redirect(`/dashboard_new.html?token=${authToken}`);
  } catch (err) {
    logger.error('❌ خطأ في تفعيل الحساب', { error: err.message, stack: err.stack, token });
    res.status(500).json({ message: 'خطأ في السيرفر أو رابط تفعيل غير صالح', success: false });
  }
});

// مسار تسجيل الدخول
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { username, password } = req.body;
  try {
    const normalizedUsername = username.toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      logger.warn('❌ Login failed: username not found', { username: normalizedUsername });
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }
    if (!user.isVerified) {
      logger.warn('❌ Login failed: account not verified', { username: normalizedUsername });
      return res.status(400).json({ message: 'الحساب غير مفعل، تحقق من بريدك الإلكتروني', success: false });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('❌ Login failed: incorrect password', { username: normalizedUsername });
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة', success: false });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '30d' }
    );
    logger.info('✅ Login successful', { username: normalizedUsername });
    res.status(200).json({ token, role: user.role, userId: user._id, username: user.username, success: true });
  } catch (err) {
    logger.error('❌ خطأ في تسجيل الدخول', { error: err.message, stack: err.stack, requestBody: req.body });
    res.status(500).json({ message: 'خطأ في السيرفر، حاول مرة أخرى', success: false });
  }
});

// مسار تسجيل الخروج
router.post('/logout', (req, res) => {
  const { username } = req.body;
  if (!username) {
    logger.warn('❌ Logout failed: username is required');
    return res.status(400).json({ message: 'اسم المستخدم مطلوب', success: false });
  }
  logger.info('✅ User logged out successfully', { username });
  res.status(200).json({ message: 'تم تسجيل الخروج بنجاح', success: true });
});

// مسار تسجيل الدخول عبر جوجل
router.post('/google', validateBody(googleSchema), async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      logger.error('❌ Google login failed: GOOGLE_CLIENT_ID not set');
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
      logger.info('✅ Google login successful', { email });
      res.json({ token, role: user.role, userId: user._id, username: user.username, newUser: false, success: true });
    } else {
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        logger.warn('❌ Google login failed: email already registered', { email });
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
      logger.info('✅ Google registration successful', { email, username });
      res.json({ token, role: user.role, userId: user._id, username: user.username, newUser: true, success: true });
    }
  } catch (error) {
    logger.error('❌ خطأ في تسجيل الدخول بجوجل', { error: error.message, stack: error.stack, requestBody: req.body });
    res.status(401).json({ message: 'فشل في التحقق من بيانات جوجل، حاول مرة أخرى', success: false });
  }
});

module.exports = router;
