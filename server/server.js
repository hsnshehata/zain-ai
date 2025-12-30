require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const facebookRoutes = require('./routes/facebook');
const webhookRoutes = require('./routes/webhook');
const authRoutes = require('./routes/auth');
const botsRoutes = require('./routes/bots');
const usersRoutes = require('./routes/users');
const rulesRoutes = require('./routes/rules');
const botRoutes = require('./routes/bot');
const analyticsRoutes = require('./routes/analytics');
const chatPageRoutes = require('./routes/chat-page');
const messagesRoutes = require('./routes/messages');
const indexRoutes = require('./routes/index');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const storesRoutes = require('./routes/stores');
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories'); // إضافة routes الأقسام
const customersRoutes = require('./routes/customers');
const suppliersRoutes = require('./routes/suppliers');
const salesRoutes = require('./routes/sales');
const ordersRoutes = require('./routes/orders');
const expensesRoutes = require('./routes/expenses');
const waRoutes = require('./routes/wa');
const connectDB = require('./db');
const Conversation = require('./models/Conversation');
const Bot = require('./models/Bot');
const User = require('./models/User');
const Feedback = require('./models/Feedback');
const Store = require('./models/Store');
const Category = require('./models/Category'); // إضافة موديل Category
const NodeCache = require('node-cache');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { checkAutoStopBots, refreshInstagramTokens } = require('./cronJobs');
const authenticate = require('./middleware/authenticate');
const waService = require('./waService');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إعداد cache لتخزين طلبات الـ API مؤقتاً (5 دقايق)
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// إعداد Rate Limiting (100 طلب كل 15 دقيقة لكل IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 300, // عدد الطلبات المسموح بيها لكل IP
  message: {
    message: 'تم تجاوز الحد الأقصى لعدد الطلبات، برجاء المحاولة مرة أخرى بعد 15 دقيقة',
    error: 'RateLimitExceeded',
    retryAfter: 15 * 60 // عدد الثواني المتبقية
  }
});

const app = express();

// تفعيل trust proxy للتعامل مع X-Forwarded-For من Render
app.set('trust proxy', 1);

// إضافة Cross-Origin-Opener-Policy Header
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Middleware لإضافة Cache-Control headers
app.use((req, res, next) => {
  if (req.path.match(/\.(html)$/i) || ['/', '/dashboard', '/dashboard_new', '/login', '/register', '/set-whatsapp', '/chat/', '/store/'].some(path => req.path.startsWith(path))) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } 
  else if (req.path.match(/\.(css|js|woff|woff2|ttf)$/i) && req.path.includes('/chat')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', req.path.match(/\.css$/i) ? 'text/css' : req.path.match(/\.js$/i) ? 'application/javascript' : 'font/woff2');
  } 
  else if (req.path.match(/\.(png|jpg|jpeg|gif|ico|json)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  console.log(`[${getTimestamp()}] 📡 Request: ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());

// زيادة الحد الأقصى لحجم الـ JSON Payload لـ 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../public')));

// تطبيق Rate Limiting — تجاهل الطلبات المرافقة بترويسة Authorization (مستخدمون مسجلون)
// هذا يمنع حظر المستخدمين المصادق عليهم عند قيامهم بطلبات متكررة من الواجهة.
app.use((req, res, next) => {
  try {
    // إذا كانت هناك ترويسة Authorization، افترض أنها طلب مصادق عليه وتجاوز الـ limiter
    if (req.header('Authorization')) return next();
    return limiter(req, res, next);
  } catch (e) {
    return next();
  }
});

// Route لجلب GOOGLE_CLIENT_ID
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID
  });
});

// Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/bots', facebookRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat-page', chatPageRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes); // إضافة routes الأقسام
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/wa', waRoutes);
app.use('/', indexRoutes);

// Route لصفحة المتجر
app.get('/store/:storeLink', async (req, res) => {
  try {
    const { storeLink } = req.params;
    const store = await Store.findOne({ storeLink });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Store not found for link: ${storeLink}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }
    const filePath = path.join(__dirname, '../public/store.html');
    console.log(`[${getTimestamp()}] Serving store.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving store.html:`, err);
        res.status(500).json({ message: 'Failed to load store page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in store route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Route للاندينج بيج
app.get('/store/:storeLink/landing', async (req, res) => {
  try {
    const { storeLink } = req.params;
    const store = await Store.findOne({ storeLink });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Store not found for link: ${storeLink}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }
    const filePath = path.join(__dirname, '../public/landing.html');
    console.log(`[${getTimestamp()}] Serving landing.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving landing.html:`, err);
        res.status(500).json({ message: 'Failed to load landing page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in landing route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// نقطة النهاية للتحقق من التوكن
app.get('/api/auth/check', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    res.json({
      success: true,
      token: req.header('Authorization')?.replace('Bearer ', ''),
      role: user.role,
      userId: user._id,
      username: user.username,
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in /api/auth/check:`, err.message, err.stack);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر', error: err.message });
  }
});

// Route لإدارة التقييمات
app.post('/api/feedback', async (req, res) => {
  try {
    const { userId, botId, messageId, type, messageContent } = req.body;
    if (!userId || !botId || !messageId || !type || !messageContent) {
      return res.status(400).json({ message: 'userId, botId, messageId, type, and messageContent are required.' });
    }
    if (!['like', 'dislike'].includes(type)) {
      return res.status(400).json({ message: 'type must be like or dislike.' });
    }

    const feedback = await Feedback.findOneAndUpdate(
      { userId, messageId },
      { botId, userId, messageId, type, messageContent, timestamp: new Date(), isVisible: true },
      { upsert: true, new: true }
    );

    console.log(`[${getTimestamp()}] ✅ Feedback saved: ${type} for bot: ${botId}, user: ${userId}, message: ${messageId}`);
    res.status(200).json(feedback);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error saving feedback:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

app.get('/api/feedback/:botId', authenticate, async (req, res) => {
  try {
    const { botId } = req.params;
    const feedback = await Feedback.find({ botId, isVisible: true }).sort({ timestamp: -1 });
    
    const feedbackWithCompat = feedback.map(item => ({
      ...item._doc,
      feedback: item.type === 'like' ? 'positive' : 'negative'
    }));

    console.log(`[${getTimestamp()}] ✅ Feedback retrieved for bot: ${botId}`);
    res.status(200).json(feedbackWithCompat);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching feedback:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Route لجلب المحادثات بتاعت المستخدم مع البوت
app.get('/api/conversations/:botId/:userId', async (req, res) => {
  try {
    const { botId, userId } = req.params;
    const conversations = await Conversation.find({ botId, userId }).sort({ 'messages.timestamp': -1 });
    res.status(200).json(conversations);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching conversations | Bot: ${req.params.botId} | User: ${req.params.userId}`, err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Route لاختبار النظام
app.get('/api/test', async (req, res) => {
  try {
    const testResults = {};

    const testUser = new User({
      username: 'test_user_' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      whatsapp: '1234567890',
      password: await bcrypt.hash('test123', 10),
      role: 'user',
      subscriptionType: 'monthly',
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isVerified: true
    });
    await testUser.save();

    const testBot = new Bot({
      name: 'Test Bot',
      userId: testUser._id,
      isActive: false,
      subscriptionType: 'free',
      autoStopDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    await testBot.save();

    testResults.createUserAndBot = 'تم إنشاء مستخدم وبوت متوقف بنجاح';

    let messageResponse;
    try {
      const res = await axios.post('http://localhost:5000/api/bot', { botId: testBot._id, message: 'Test message' });
      messageResponse = { status: res.status, body: res.data };
    } catch (err) {
      messageResponse = { status: err.response?.status || 500, body: err.response?.data || { message: err.message } };
    }

    if (messageResponse.status === 400 && messageResponse.body.message.includes('متوقف')) {
      testResults.inactiveBotMessage = 'تم منع معالجة الرسالة للبوت المتوقف بنجاح';
    } else {
      testResults.inactiveBotMessage = 'فشل في منع معالجة الرسالة للبوت المتوقف';
    }

    const userData = await User.findById(testUser._id);
    if (userData.subscriptionType === 'monthly' && userData.subscriptionEndDate) {
      testResults.userData = 'تم استرجاع بيانات المستخدم (نوع الاشتراك وتاريخ الانتهاء) بنجاح';
    } else {
      testResults.userData = 'فشل في استرجاع بيانات المستخدم بشكل صحيح';
    }

    const testNotification = new Notification({
      user: testUser._id,
      title: 'اختبار إشعار',
      message: 'هذه رسالة اختبار للإشعار',
      isRead: false
    });
    await testNotification.save();

    const notifications = await Notification.find({ user: testUser._id });
    if (notifications.length === 1 && notifications[0].title === 'اختبار إشعار') {
      testResults.notification = 'تم إنشاء إشعار مع عنوان بنجاح';
    } else {
      testResults.notification = 'فشل في إنشاء إشعار مع عنوان';
    }

    await Notification.deleteOne({ _id: testNotification._id });
    await Bot.deleteOne({ _id: testBot._id });
    await User.deleteOne({ _id: testUser._id });

    res.status(200).json({ message: 'اختبارات النظام اكتملت', results: testResults });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في اختبار النظام:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في اختبار النظام', error: err.message });
  }
});

// Routes للصفحات
app.get('/dashboard', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/dashboard.html');
    console.log(`[${getTimestamp()}] Serving dashboard.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving dashboard.html:`, err);
        res.status(500).json({ message: 'Failed to load dashboard page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in dashboard route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/dashboard_new', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/dashboard_new.html');
    console.log(`[${getTimestamp()}] Serving dashboard_new.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving dashboard_new.html:`, err);
        res.status(500).json({ message: 'Failed to load dashboard page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in dashboard_new route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/login', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/login.html');
    console.log(`[${getTimestamp()}] Serving login.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving login.html:`, err);
        res.status(500).json({ message: 'Failed to load login page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in login route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/register', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/register.html');
    console.log(`[${getTimestamp()}] Serving register.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving register.html:`, err);
        res.status(500).json({ message: 'Failed to load register page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in register route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/set-whatsapp', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/set-whatsapp.html');
    console.log(`[${getTimestamp()}] Serving set-whatsapp.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving set-whatsapp.html:`, err);
        res.status(500).json({ message: 'Failed to load set-whatsapp page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in set-whatsapp route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/chat/:linkId', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/chat.html');
    console.log(`[${getTimestamp()}] Serving chat.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${getTimestamp()}] Error serving chat.html:`, err);
        res.status(500).json({ message: 'Failed to load chat page' });
      }
    });
  } catch (err) {
    console.error(`[${getTimestamp()}] Error in chat route:`, err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Middleware لمعالجة 404 (يضمن رد JSON)
app.use((req, res, next) => {
  console.log(`[${getTimestamp()}] ❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    message: 'الطلب غير موجود',
    error: 'NotFound',
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const userId = req.user ? req.user.userId : 'N/A';
  console.error(`[${getTimestamp()}] ❌ Server error | Method: ${req.method} | URL: ${req.url} | User: ${userId}`, err.message, err.stack);
  res.status(500).json({ 
    message: err.message || 'Something went wrong!',
    error: err.name || 'ServerError',
    details: err.message
  });
});

process.on('uncaughtException', (err) => {
  console.error(`[${getTimestamp()}] ❌ Uncaught Exception:`, err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${getTimestamp()}] ❌ Unhandled Rejection at:`, promise, 'reason:', reason);
});

// Connect to MongoDB
connectDB()
  .then(() => waService.bootstrap())
  .catch((err) => console.error('[bootstrap] Mongo connect failed', err.message));

// تشغيل وظايف التحقق الدورية
checkAutoStopBots();
refreshInstagramTokens();

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${getTimestamp()}] ✅ Server running on port ${PORT}`);
});
