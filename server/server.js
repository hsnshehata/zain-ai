const express = require('express');
const cors = require('cors');
const path = require('path');
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
const { processMessage } = require('./botEngine');
const NodeCache = require('node-cache');

// إعداد cache لتخزين طلبات الـ API مؤقتاً (5 دقايق)
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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
    console.error('❌ Error fetching conversations:', err.message, err.stack);
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
      console.log(`⚠️ Duplicate AI message detected with key ${messageKey}, skipping...`);
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
      console.log(`⚠️ Duplicate message detected in conversation for ${userId}, skipping...`);
      return res.status(200).json({ reply: 'تم معالجة هذه الرسالة من قبل' });
    }

    const reply = await processMessage(botId, userId, message);
    res.status(200).json({ reply });
  } catch (err) {
    console.error('❌ Error in AI route:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to process AI request' });
  }
});

// Route for dashboard
app.get('/dashboard', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/dashboard.html');
    console.log('Serving dashboard.html from:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving dashboard.html:', err);
        res.status(500).json({ message: 'Failed to load dashboard page' });
      }
    });
  } catch (err) {
    console.error('Error in dashboard route:', err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Route for dashboard_new
app.get('/dashboard_new', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/dashboard_new.html');
    console.log('Serving dashboard_new.html from:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving dashboard_new.html:', err);
        res.status(500).json({ message: 'Failed to load dashboard page' });
      }
    });
  } catch (err) {
    console.error('Error in dashboard_new route:', err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Route for login
app.get('/login', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/login.html');
    console.log('Serving login.html from:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving login.html:', err);
        res.status(500).json({ message: 'Failed to load login page' });
      }
    });
  } catch (err) {
    console.error('Error in login route:', err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Route for register
app.get('/register', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/register.html');
    console.log('Serving register.html from:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving register.html:', err);
        res.status(500).json({ message: 'Failed to load register page' });
      }
    });
  } catch (err) {
    console.error('Error in register route:', err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Route for set-whatsapp
app.get('/set-whatsapp', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/set-whatsapp.html');
    console.log('Serving set-whatsapp.html from:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving set-whatsapp.html:', err);
        res.status(500).json({ message: 'Failed to load set-whatsapp page' });
      }
    });
  } catch (err) {
    console.error('Error in set-whatsapp route:', err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Route for chat page
app.get('/chat/:linkId', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/chat.html');
    console.log('Serving chat.html from:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving chat.html:', err);
        res.status(500).json({ message: 'Failed to load chat page' });
      }
    });
  } catch (err) {
    console.error('Error in chat route:', err);
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

// Connect to MongoDB
connectDB();

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message, err.stack);
  res.status(500).json({ message: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
