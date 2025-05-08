// /server/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const request = require('request');
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
const connectDB = require('./db');
const Conversation = require('./models/Conversation');
const Bot = require('./models/Bot');
const User = require('./models/User');
const { processMessage } = require('./botEngine');
const NodeCache = require('node-cache');
const { checkAutoStopBots } = require('./cronJobs');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إعداد cache لتخزين طلبات الـ API مؤقتاً (5 دقايق)
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// إعداد Rate Limiting (100 طلب كل 15 دقيقة لكل IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // عدد الطلبات المسموح بيها لكل IP
  message: {
    message: 'تم تجاوز الحد الأقصى لعدد الطلبات، برجاء المحاولة مرة أخرى بعد 15 دقيقة',
    error: 'RateLimitExceeded',
    retryAfter: 15 * 60 // عدد الثواني المتبقية
  }
});

const app = express();

// إضافة Cross-Origin-Opener-Policy Header
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// تطبيق Rate Limiting على كل الـ routes
app.use(limiter);

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
app.use('/', indexRoutes);

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

// Route جديد للذكاء الاصطناعي
app.post('/api/bot/ai', async (req, res) => {
  try {
    const { botId, message, userId } = req.body;
    if (!botId || !message || !userId) {
      return res.status(400).json({ message: 'Bot ID, message, and user ID are required' });
    }

    // فحص تكرار الطلب
    const messageKey = `${botId}-${userId}-${message}-${Date.now()}`;
    if (apiCache.get(messageKey)) {
      console.log(`[${getTimestamp()}] ⚠️ Duplicate AI message detected with key ${messageKey}, skipping...`);
      return res.status(200).json({ reply: 'تم معالجة هذه الرسالة من قبل' });
    }
    apiCache.set(messageKey, true);

    // جلب المحادثة
    let conversation = await Conversation.findOne({ botId, userId });
    if (!conversation) {
      conversation = new Conversation({
        botId,
        userId,
        messages: [],
      });
      await conversation.save();
    }

    // فحص إذا كانت الرسالة موجودة
    const messageExists = conversation.messages.some(msg => 
      msg.content === message && 
      Math.abs(new Date(msg.timestamp) - Date.now()) < 1000
    );
    if (messageExists) {
      console.log(`[${getTimestamp()}] ⚠️ Duplicate message detected in conversation for ${userId}, skipping...`);
      return res.status(200).json({ reply: 'تم معالجة هذه الرسالة من قبل' });
    }

    const reply = await processMessage(botId, userId, message);
    res.status(200).json({ reply });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in AI route | User: ${req.body.userId || 'N/A'} | Bot: ${req.body.botId || 'N/A'}`, err.message, err.stack);
    res.status(500).json({ message: 'Failed to process AI request' });
  }
});

// Route لاختبار النظام
app.get('/api/test', async (req, res) => {
  try {
    const testResults = {};

    // اختبار 1: إنشاء مستخدم وبوت متوقف
    const testUser = new User({
      username: 'test_user_' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      whatsapp: '1234567890',
      password: await bcrypt.hash('test123', 10),
      role: 'user',
      subscriptionType: 'monthly',
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم من الآن
      isVerified: true
    });
    await testUser.save();

    const testBot = new Bot({
      name: 'Test Bot',
      userId: testUser._id,
      isActive: false,
      subscriptionType: 'free',
      autoStopDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // غدًا
    });
    await testBot.save();

    testResults.createUserAndBot = 'تم إنشاء مستخدم وبوت متوقف بنجاح';

    // اختبار 2: محاولة إرسال رسالة للبوت المتوقف
    const messageResponse = await new Promise(resolve => {
      request({
        uri: 'http://localhost:5000/api/bot',
        method: 'POST',
        json: { botId: testBot._id, message: 'Test message' }
      }, (err, res, body) => {
        resolve({ status: res.statusCode, body });
      });
    });

    if (messageResponse.status === 400 && messageResponse.body.message.includes('متوقف')) {
      testResults.inactiveBotMessage = 'تم منع معالجة الرسالة للبوت المتوقف بنجاح';
    } else {
      testResults.inactiveBotMessage = 'فشل في منع معالجة الرسالة للبوت المتوقف';
    }

    // اختبار 3: التحقق من بيانات المستخدم
    const userData = await User.findById(testUser._id);
    if (userData.subscriptionType === 'monthly' && userData.subscriptionEndDate) {
      testResults.userData = 'تم استرجاع بيانات المستخدم (نوع الاشتراك وتاريخ الانتهاء) بنجاح';
    } else {
      testResults.userData = 'فشل في استرجاع بيانات المستخدم بشكل صحيح';
    }

    // تنظيف البيانات
    await Bot.deleteOne({ _id: testBot._id });
    await User.deleteOne({ _id: testUser._id });

    res.status(200).json({ message: 'اختبارات النظام اكتملت', results: testResults });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في اختبار النظام:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في اختبار النظام', error: err.message });
  }
});

// Route for dashboard
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

// Route for dashboard_new
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

// Route for login
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

// Route for register
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

// Route for set-whatsapp
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

// Route for chat page
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

// Connect to MongoDB
connectDB();

// تشغيل وظيفة التحقق من الإيقاف التلقائي
checkAutoStopBots();

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[${getTimestamp()}] ✅ Server running on port ${PORT}`);
});
