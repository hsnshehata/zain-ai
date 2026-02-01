// /server/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bot = require('../models/Bot');
const authenticate = require('../middleware/authenticate');
const bcrypt = require('bcryptjs');
const { validateBody, Joi } = require('../middleware/validate');
const logger = require('../logger');

const usernameRule = Joi.string().pattern(/^[a-z0-9_-]+$/).min(3).max(20);

const createUserSchema = Joi.object({
  username: usernameRule.required(),
  password: Joi.string().pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/).required()
    .messages({ 'string.pattern.base': 'كلمة المرور يجب أن تحتوي على حروف وأرقام وألا تقل عن 8 أحرف' }),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'كلمات المرور غير متطابقة' }),
  role: Joi.string().valid('user', 'superadmin').required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  whatsapp: Joi.string().allow('', null)
});

const updateUserSchema = Joi.object({
  username: usernameRule.optional(),
  password: Joi.string().pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/).optional()
    .messages({ 'string.pattern.base': 'كلمة المرور يجب أن تحتوي على حروف وأرقام وألا تقل عن 8 أحرف' }),
  confirmPassword: Joi.any().valid(Joi.ref('password')).when('password', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }).messages({ 'any.only': 'كلمات المرور غير متطابقة' }),
  role: Joi.string().valid('user', 'superadmin').optional(),
  email: Joi.string().email({ tlds: { allow: false } }).optional(),
  whatsapp: Joi.string().allow('', null).optional()
});

// Get current user data
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      logger.warn('❌ User not found', { userId: req.user.userId });
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    logger.info('✅ User data fetched', { userId: req.user.userId });
    res.status(200).json({
      email: user.email,
      username: user.username,
      whatsapp: user.whatsapp,
      role: user.role
    });
  } catch (err) {
    logger.error('❌ Error fetching user data', { err });
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
    logger.error('Error fetching users', { err });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Create a new user (Superadmin only)
router.post('/', authenticate, validateBody(createUserSchema), async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  const { username, password, role, email, whatsapp } = req.body;
  try {
    const normalizedUsername = username.toLowerCase(); // تحويل الـ username للحروف الصغيرة
    const existingUser = await User.findOne({ $or: [{ username: normalizedUsername }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username: normalizedUsername, password: hashedPassword, role, email, whatsapp });
    await user.save();
    res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح' });
  } catch (err) {
    logger.error('Error creating user', { err });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Update a user (Superadmin can update any user, regular user can update themselves)
router.put('/:id', authenticate, validateBody(updateUserSchema), async (req, res) => {
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
    logger.error('Error updating user', { err });
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
    logger.error('Error deleting user', { err });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

module.exports = router;

// Store-scoped employee management (used by store dashboard)
const employeesCtrl = require('../controllers/employeesController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/:storeId/users', authenticate, employeesCtrl.getEmployees);
router.get('/:storeId/users/:id', authenticate, employeesCtrl.getEmployee);
router.post('/:storeId/users', authenticate, upload.single('idImage'), employeesCtrl.createEmployee);
router.put('/:storeId/users/:id', authenticate, upload.single('idImage'), employeesCtrl.updateEmployee);
