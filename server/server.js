const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const facebookRoutes = require('./routes/facebook');
const webhookRoutes = require('./routes/webhook');
const authRoutes = require('./routes/auth');
const botsRoutes = require('./routes/bots');
const usersRoutes = require('./routes/users');
const rulesRoutes = require('./routes/rules');
const botRoutes = require('./routes/bot');
const analyticsRoutes = require('./routes/analytics');
const chatPageRoutes = require('./routes/chat-page');
const indexRoutes = require('./routes/index');
const connectDB = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files from ../public like old system

// Routes
app.use('/api/facebook', facebookRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat-page', chatPageRoutes);
app.use('/', indexRoutes); // Use indexRoutes for root like old system

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
