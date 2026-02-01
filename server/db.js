const mongoose = require('mongoose');
const logger = require('./logger');

let reconnecting = false;

const connectDB = async (retries = 5, delayMs = 5000) => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    logger.error('❌ MONGODB_URI is not defined in environment variables. Please set it in Render Dashboard.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
    });
    logger.info('✅ MongoDB connected');

    const { connection } = mongoose;
    connection.on('disconnected', () => {
      if (reconnecting) return;
      reconnecting = true;
      logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
      setTimeout(() => {
        connectDB(3).finally(() => { reconnecting = false; });
      }, 3000);
    });

    connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });

    connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error event:', { err: err.message });
    });
  } catch (err) {
    if (retries > 0) {
      logger.warn('Retrying MongoDB connection...', { retries });
      await new Promise((res) => setTimeout(res, delayMs));
      return connectDB(retries - 1, delayMs);
    }
    logger.error('❌ MongoDB connection failed after retries', { err });
    process.exit(1);
  }
};

module.exports = connectDB;
