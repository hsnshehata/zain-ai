// /server/controllers/usersController.js
const User = require('../models/User');
const Bot = require('../models/Bot');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// إنشاء مستخدم جديد
exports.createUser = async (req, res) => {
  const { username, email, whatsapp, password, confirmPassword, role, subscriptionType, subscriptionEndDate, botName } = req.body;

  if (!username || !email || !whatsapp || !password || !confirmPassword || !botName) {
    const logger = require('../logger');
    logger.warn('create_user_failed_required');
    return res.status(400).json({ message: 'جميع الحقول مطلوبة، بما في ذلك اسم البوت' });
  }

  if (password !== confirmPassword) {
    const logger = require('../logger');
    logger.warn('create_user_failed_password_mismatch');
    return res.status(400).json({ message: 'كلمات المرور غير متطابقة' });
  }

  if (subscriptionType && !['free', 'monthly', 'yearly'].includes(subscriptionType)) {
    const logger = require('../logger');
    logger.warn('create_user_failed_invalid_subscription');
    return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
  }

  try {
    const normalizedUsername = username.toLowerCase(); // تحويل الـ username للحروف الصغيرة
    const existingUser = await User.findOne({ $or: [{ username: normalizedUsername }, { email }] });
    if (existingUser) {
      const logger = require('../logger');
      logger.warn('create_user_failed_exists', { username: normalizedUsername, email });
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: normalizedUsername, // تخزين الـ username بحروف صغيرة
      email,
      whatsapp,
      password: hashedPassword,
      role: role || 'user',
      subscriptionType: subscriptionType || 'free',
      subscriptionEndDate: subscriptionEndDate || null
    });

    await user.save();
    
    // إنشاء بوت جديد مع فترة مجانية 30 يوم
    const freeTrialEndDate = new Date();
    freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 30); // إضافة 30 يوم من تاريخ الإنشاء
    
    const bot = new Bot({
      name: botName,
      userId: user._id,
      subscriptionType: 'free',
      autoStopDate: freeTrialEndDate,
      isActive: true
    });
    await bot.save();

    // إضافة البوت لقايمة bots بتاعة اليوزر
    user.bots.push(bot._id);
    await user.save();

    const logger = require('../logger');
    logger.info('create_user_success', { username: normalizedUsername, botName });
    res.status(201).json({ user, bot });
  } catch (err) {
    const logger = require('../logger');
    logger.error('create_user_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب كل المستخدمين
exports.getAllUsers = async (req, res) => {
  try {
    const populateFields = req.query.populate || '';
    let users;
    if (populateFields.includes('bots')) {
      users = await User.find().populate('bots');
    } else {
      users = await User.find();
    }
    const logger = require('../logger');
    logger.info('get_users_success', { count: users.length });
    res.status(200).json(users);
  } catch (err) {
    const logger = require('../logger');
    logger.error('get_users_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب مستخدم معين بناءً على الـ ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('bots');
    if (!user) {
      const logger = require('../logger');
      logger.warn('get_user_not_found', { userId: req.params.id });
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    const logger = require('../logger');
    logger.info('get_user_success', { userId: req.params.id });
    res.status(200).json(user);
  } catch (err) {
    const logger = require('../logger');
    logger.error('get_user_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
};

// تعديل مستخدم
exports.updateUser = async (req, res) => {
  const { username, email, whatsapp, password, role, subscriptionType, subscriptionEndDate } = req.body;

  if (subscriptionType && !['free', 'monthly', 'yearly'].includes(subscriptionType)) {
    const logger = require('../logger');
    logger.warn('update_user_failed_invalid_subscription');
    return res.status(400).json({ message: 'نوع الاشتراك غير صالح' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      const logger = require('../logger');
      logger.warn('update_user_not_found', { userId: req.params.id });
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const normalizedUsername = username ? username.toLowerCase() : user.username; // تحويل الـ username للحروف صغيرة
    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername, _id: { $ne: req.params.id } },
        { email: email || user.email, _id: { $ne: req.params.id } }
      ]
    });
    if (existingUser) {
      const logger = require('../logger');
      logger.warn('update_user_exists', { username: normalizedUsername, email });
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }

    user.username = normalizedUsername;
    user.email = email || user.email;
    user.whatsapp = whatsapp || user.whatsapp;
    user.role = role || user.role;
    user.subscriptionType = subscriptionType || user.subscriptionType;
    user.subscriptionEndDate = subscriptionEndDate !== undefined ? subscriptionEndDate : user.subscriptionEndDate;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    const logger = require('../logger');
    logger.info('update_user_success', { userId: user._id });
    res.status(200).json(user);
  } catch (err) {
    const logger = require('../logger');
    logger.error('update_user_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// حذف مستخدم
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      const logger = require('../logger');
      logger.warn('delete_user_not_found', { userId: req.params.id });
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // حذف البوتات المرتبطة بالمستخدم
    await Bot.deleteMany({ userId: user._id });
    // حذف الإشعارات المرتبطة بالمستخدم
    await Notification.deleteMany({ user: user._id });

    await User.deleteOne({ _id: req.params.id });
    const logger = require('../logger');
    logger.info('delete_user_success', { userId: user._id });
    res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    const logger = require('../logger');
    logger.error('delete_user_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
