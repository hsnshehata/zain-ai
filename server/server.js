require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
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
const chatOrdersRoutes = require('./routes/chatOrders');
const chatCustomersRoutes = require('./routes/chatCustomers');
const telegramRoutes = require('./routes/telegram');
const AppError = require('./utils/appError');
const errorHandler = require('./middleware/errorHandler');
// removed waRoutes (local WA app)
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
const logger = require('./logger');
const promClient = require('prom-client');
const { checkAutoStopBots, refreshInstagramTokens, cleanupOldLogs } = require('./cronJobs');
const authenticate = require('./middleware/authenticate');

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

// معدل تشديد لمسارات المصادقة الحساسة
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 7,
  message: {
    message: 'تم تجاوز عدد محاولات الدخول، حاول لاحقاً',
    error: 'AuthRateLimit',
    retryAfter: 15 * 60
  }
});

// معدل مخصص للويب هوكس لتفادي التدفق الزائد
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'تم تجاوز الحد المسموح لطلبات الويب هوك مؤقتاً',
    error: 'WebhookRateLimit',
    retryAfter: 60
  }
});

const app = express();

// إعداد المتركات Prometheus
const register = new promClient.Registry();
if (process.env.NODE_ENV !== 'test') {
  promClient.collectDefaultMetrics({ register });
}
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

// تفعيل trust proxy للتعامل مع X-Forwarded-For من Render
app.set('trust proxy', 1);

// تفعيل Helmet مع ضبط سياسة الـ CSP للسماح بمصادر الواجهة الخارجية المستخدمة
app.use(helmet({
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://connect.facebook.net',
        'https://accounts.google.com'
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // السماح بـ inline event handlers مثل onclick
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdnjs.cloudflare.com',
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'data:',
        'https://cdnjs.cloudflare.com',
        'https://fonts.gstatic.com',
        'https://r2cdn.perplexity.ai'
      ],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      frameSrc: [
        "'self'",
        'https://www.youtube.com',
        'https://www.youtube-nocookie.com',
        'https://player.vimeo.com'
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'", "*"],
    },
  },
}));

// إضافة معرّف بسيط لكل طلب لتتبعه في اللوجز
app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.originalUrl || 'unknown', status: res.statusCode });
  });
  next();
});

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
  else if (req.path.match(/\.(css|js|woff|woff2|ttf)$/i)) {
    // أصول ثابتة - تخزين مؤقت طويل الأجل
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // إضافة headers لتحسين الأداء والأمان
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  logger.info('request', { method: req.method, url: req.url, ip: req.ip, ua: req.headers['user-agent'] });
  next();
});

// Middleware
app.use(cors());

// زيادة الحد الأقصى لحجم الـ JSON Payload لـ 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../public')));

// تطبيق Rate Limiting للجميع
app.use(limiter);

// تطبيق Rate Limiting مخصص لمسارات اللوجين والتسجيل وتسجيل الدخول بجوجل
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/verify', authLimiter);

// Rate limit معتمد على المستخدم للمسارات المحمية
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'تم تجاوز عدد الطلبات المسموح بها للحساب مؤقتاً، حاول لاحقاً',
    error: 'AccountRateLimit',
    retryAfter: 15 * 60,
  },
});

const authenticatedPaths = [
  '/api/bots',
  '/api/users',
  '/api/rules',
  '/api/analytics',
  '/api/messages',
  '/api/notifications',
  '/api/stores',
  '/api/products',
  '/api/categories',
  '/api/customers',
  '/api/suppliers',
  '/api/sales',
  '/api/orders',
  '/api/expenses',
  '/api/chat-orders',
  '/api/chat-customers',
];
app.use(authenticatedPaths, authenticate, accountLimiter);

// Route لجلب GOOGLE_CLIENT_ID
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID
  });
});

// Routes
app.use('/api/webhook', webhookLimiter, webhookRoutes);
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
app.use('/api/chat-orders', chatOrdersRoutes);
app.use('/api/chat-customers', chatCustomersRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/', indexRoutes);

// مسار المتركات (حماية اختيارية عبر METRICS_TOKEN)
app.get('/metrics', async (req, res, next) => {
  try {
    const token = process.env.METRICS_TOKEN;
    if (token && req.header('x-metrics-key') !== token) {
      return res.status(401).send('unauthorized');
    }
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    return res.send(metrics);
  } catch (err) {
    return next(err);
  }
});

// Route لصفحة المتجر
app.get('/store/:storeLink', async (req, res) => {
  try {
    const { storeLink } = req.params;
    const store = await Store.findOne({ storeLink });
    if (!store) {
      logger.warn('store_not_found', { storeLink });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }
    const filePath = path.join(__dirname, '../public/store.html');
    logger.info('serve_store_page', { storeLink, filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_store_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load store page' });
      }
    });
  } catch (err) {
    logger.error('store_route_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Route للاندينج بيج
app.get('/store/:storeLink/landing', async (req, res) => {
  try {
    const { storeLink } = req.params;
    const store = await Store.findOne({ storeLink });
    if (!store) {
      logger.warn('store_landing_not_found', { storeLink });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }
    const filePath = path.join(__dirname, '../public/landing.html');
    logger.info('serve_landing_page', { storeLink, filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_landing_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load landing page' });
      }
    });
  } catch (err) {
    logger.error('landing_route_error', { err: err.message, stack: err.stack });
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
    logger.error('auth_check_error', { err: err.message, stack: err.stack });
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

    logger.info('feedback_saved', { botId, userId, messageId, type });
    res.status(200).json(feedback);
  } catch (err) {
    logger.error('feedback_save_error', { err: err.message, stack: err.stack });
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

    logger.info('feedback_fetch_success', { botId });
    res.status(200).json(feedbackWithCompat);
  } catch (err) {
    logger.error('feedback_fetch_error', { err: err.message, stack: err.stack });
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
    logger.error('conversations_fetch_error', { botId: req.params.botId, userId: req.params.userId, err: err.message, stack: err.stack });
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
    logger.error('system_test_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في اختبار النظام', error: err.message });
  }
});

// Routes للصفحات
app.get('/dashboard', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/dashboard.html');
    logger.info('serve_dashboard_page', { filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_dashboard_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load dashboard page' });
      }
    });
  } catch (err) {
    logger.error('dashboard_route_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/dashboard_new', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/dashboard_new.html');
    logger.info('serve_dashboard_new_page', { filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_dashboard_new_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load dashboard page' });
      }
    });
  } catch (err) {
    logger.error('dashboard_new_route_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/login', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/login.html');
    logger.info('serve_login_page', { filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_login_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load login page' });
      }
    });
  } catch (err) {
    logger.error('login_route_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/register', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/register.html');
    logger.info('serve_register_page', { filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_register_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load register page' });
      }
    });
  } catch (err) {
    logger.error('register_route_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/set-whatsapp', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/set-whatsapp.html');
    logger.info('serve_set_whatsapp_page', { filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_set_whatsapp_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load set-whatsapp page' });
      }
    });
  } catch (err) {
    logger.error('set_whatsapp_route_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

app.get('/chat/:linkId', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/chat.html');
    logger.info('serve_chat_page', { filePath });
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('serve_chat_error', { err: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to load chat page' });
      }
    });
  } catch (err) {
    logger.error('chat_route_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// SEO Routes - مسارات تحسين محركات البحث
app.get('/sitemap.xml', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/sitemap.xml');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // تخزين مؤقت لمدة 24 ساعة
    res.sendFile(filePath);
  } catch (err) {
    logger.error('sitemap_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Sitemap not found' });
  }
});

app.get('/robots.txt', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/robots.txt');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // تخزين مؤقت لمدة 24 ساعة
    res.sendFile(filePath);
  } catch (err) {
    logger.error('robots_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'Robots.txt not found' });
  }
});

// مسار غير موجود
app.use((req, res, next) => {
  next(new AppError('المسار غير موجود', 404, 'NotFound'));
});

// معالج أخطاء مركزي
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { err: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandled_rejection', { reason, promise });
});

// Connect to MongoDB
connectDB()
  .catch((err) => logger.error('mongo_connect_failed', { err: err.message, stack: err.stack }));

// تشغيل وظايف التحقق الدورية (تخطيها في الاختبارات لتقليل المقابض المفتوحة)
if (process.env.NODE_ENV !== 'test') {
  checkAutoStopBots();
  refreshInstagramTokens();
  cleanupOldLogs();
}

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', { port: PORT });
  });
}

module.exports = app;
