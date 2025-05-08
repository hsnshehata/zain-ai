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

// تفعيل trust proxy للتعامل مع X-Forwarded-For من Render
app.set('trust proxy', 1);

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

// باقي الكود زي ما هو...
