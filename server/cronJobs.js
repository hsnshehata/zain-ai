const cron = require('node-cron');
const Bot = require('./models/Bot');
const Notification = require('./models/Notification');
const Product = require('./models/Product');
const Store = require('./models/Store');
const axios = require('axios');
const logger = require('./logger');

// دالة للتحقق من صلاحية التوكين
const isTokenValid = async (accessToken, pageId) => {
  try {
    await axios.get(`https://graph.facebook.com/v20.0/${pageId}?fields=id&access_token=${accessToken}`);
    logger.info('✅ Token is valid', { pageId });
    return true;
  } catch (err) {
    logger.error('❌ Token validation failed', { pageId, error: err.response?.data || err.message });
    return false;
  }
};

// دالة لتحويل توكن قصير أو تجديد توكن طويل لفيسبوك
const convertToLongLivedToken = async (shortLivedToken) => {
  const appId = '499020366015281'; // App ID بتاع تطبيق فيسبوك
  const appSecret = process.env.FACEBOOK_APP_SECRET; // لازم يكون موجود في .env
  const url = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

  try {
    const response = await axios.get(url);
    if (response.data.access_token) {
      logger.info('✅ Successfully converted/renewed Facebook token', { tokenPreview: `${response.data.access_token.slice(0, 10)}...` });
      return response.data.access_token;
    }
    throw new Error('Failed to convert/renew token: No access_token in response');
  } catch (err) {
    logger.error('❌ Error converting/renewing Facebook token', { error: err.response?.data || err.message });
    throw err;
  }
};

// وظيفة دورية للتحقق من تاريخ الإيقاف التلقائي
const checkAutoStopBots = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('⏰ Starting auto-stop bot check...');
      const currentDate = new Date();

      const expiredBots = await Bot.find({
        isActive: true,
        autoStopDate: { $ne: null, $lte: currentDate }
      });

      if (expiredBots.length === 0) {
        logger.info('✅ No bots found with expired subscriptions.');
        return;
      }

      const updateResult = await Bot.updateMany(
        {
          _id: { $in: expiredBots.map(bot => bot._id) },
          isActive: true
        },
        { $set: { isActive: false } }
      );

      logger.info('✅ Updated bots to inactive due to expired subscriptions.', { modifiedCount: updateResult.modifiedCount });

      for (const bot of expiredBots) {
        const notification = new Notification({
          user: bot.userId,
          title: `توقف البوت ${bot.name}`,
          message: `البوت ${bot.name} توقف تلقائيًا بسبب انتهاء الاشتراك بتاريخ ${new Date(bot.autoStopDate).toLocaleDateString('ar-EG')}. يمكنك تجديد الاشتراك من لوحة التحكم.`,
          isRead: false
        });
        await notification.save();
        logger.info('✅ Notification sent for expired bot', { userId: bot.userId, botName: bot.name });
      }

      logger.info('⏰ Auto-stop bot check completed successfully.');
    } catch (err) {
      logger.error('❌ Error in auto-stop bot check', { err });
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

// وظيفة دورية لتجديد توكنات إنستجرام
const refreshInstagramTokens = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('⏰ Starting Instagram token refresh check...');

      const botsWithInstagram = await Bot.find({
        instagramApiKey: { $ne: null },
        instagramPageId: { $ne: null }
      });

      if (botsWithInstagram.length === 0) {
        logger.info('✅ No bots found with Instagram tokens to refresh.');
        return;
      }

      logger.info('🔄 Bots with Instagram tokens to refresh', { count: botsWithInstagram.length });

      const fiftyDaysInMs = 50 * 24 * 60 * 60 * 1000;
      const currentDate = new Date();

      for (const bot of botsWithInstagram) {
        try {
          const lastRefresh = bot.lastInstagramTokenRefresh ? new Date(bot.lastInstagramTokenRefresh) : null;
          const shouldRefresh = !lastRefresh || (currentDate - lastRefresh) >= fiftyDaysInMs;

          if (!shouldRefresh) {
            logger.info('⏳ Skipping Instagram token refresh', { botId: bot._id, lastRefreshed: lastRefresh?.toISOString() });
            continue;
          }

          const currentToken = bot.instagramApiKey;
          logger.info('🔄 Attempting to refresh Instagram token', { botId: bot._id });

          const refreshResponse = await axios.get(
            `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
          );

          if (!refreshResponse.data.access_token) {
            logger.error('❌ Failed to refresh Instagram token', { botId: bot._id, error: refreshResponse.data });
            const notification = new Notification({
              user: bot.userId,
              title: `فشل تجديد توكن إنستجرام للبوت ${bot.name}`,
              message: `فشل في تجديد توكن إنستجرام للبوت ${bot.name}. يرجى إعادة ربط الحساب من لوحة التحكم.`,
              isRead: false
            });
            await notification.save();
            logger.info('✅ Notification sent for failed Instagram token refresh', { userId: bot.userId, botId: bot._id });
            continue;
          }

          const newToken = refreshResponse.data.access_token;
          const expiresIn = refreshResponse.data.expires_in;

          bot.instagramApiKey = newToken;
          bot.lastInstagramTokenRefresh = new Date();
          await bot.save();

          logger.info('✅ Successfully refreshed Instagram token', { botId: bot._id, tokenPreview: `${newToken.slice(0, 10)}...`, expiresIn });
        } catch (err) {
          logger.error('❌ Error refreshing Instagram token', { botId: bot._id, error: err.message, data: err.response?.data });
          const notification = new Notification({
            user: bot.userId,
            title: `فشل تجديد توكن إنستجرام للبوت ${bot.name}`,
            message: `فشل في تجديد توكن إنستجرام للبوت ${bot.name}. يرجى إعادة ربط الحساب من لوحة التحكم.`,
            isRead: false
          });
          await notification.save();
          logger.info('✅ Notification sent for failed Instagram token refresh', { userId: bot.userId, botId: bot._id });
        }
      }

      logger.info('⏰ Instagram token refresh check completed successfully.');
    } catch (err) {
      logger.error('❌ Error in Instagram token refresh check', { err });
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

// وظيفة دورية لتجديد توكنات فيسبوك
const refreshFacebookTokens = () => {
  cron.schedule('0 0 * * 0', async () => {
    try {
      logger.info('⏰ Starting Facebook token refresh check...');

      const botsWithFacebook = await Bot.find({
        facebookApiKey: { $ne: null },
        facebookPageId: { $ne: null }
      });

      if (botsWithFacebook.length === 0) {
        logger.info('✅ No bots found with Facebook tokens to refresh.');
        return;
      }

      logger.info('🔄 Bots with Facebook tokens to refresh', { count: botsWithFacebook.length });

      const fiftyDaysInMs = 50 * 24 * 60 * 60 * 1000;
      const currentDate = new Date();

      for (const bot of botsWithFacebook) {
        try {
          const lastRefresh = bot.lastFacebookTokenRefresh ? new Date(bot.lastFacebookTokenRefresh) : null;
          const shouldRefresh = !lastRefresh || (currentDate - lastRefresh) >= fiftyDaysInMs;

          if (!shouldRefresh) {
            logger.info('⏳ Skipping Facebook token refresh', { botId: bot._id, lastRefreshed: lastRefresh?.toISOString() });
            continue;
          }

          const currentToken = bot.facebookApiKey;
          logger.info('🔄 Attempting to validate Facebook token', { botId: bot._id });

          // التحقق من صلاحية التوكين
          const isValid = await isTokenValid(currentToken, bot.facebookPageId);
          if (isValid) {
            logger.info('✅ Facebook token still valid', { botId: bot._id });
            continue;
          }

          logger.warn('⚠️ Facebook token invalid, attempting to refresh', { botId: bot._id });
          const newToken = await convertToLongLivedToken(currentToken);

          bot.facebookApiKey = newToken;
          bot.lastFacebookTokenRefresh = new Date();
          await bot.save();

          logger.info('✅ Successfully refreshed Facebook token', { botId: bot._id, tokenPreview: `${newToken.slice(0, 10)}...` });
        } catch (err) {
          logger.error('❌ Error refreshing Facebook token', { botId: bot._id, error: err.message, data: err.response?.data });
          const notification = new Notification({
            user: bot.userId,
            title: `فشل تجديد توكن فيسبوك للبوت ${bot.name}`,
            message: `فشل في تجديد توكن فيسبوك للبوت ${bot.name}. يرجى إعادة ربط الحساب من لوحة التحكم.`,
            isRead: false
          });
          await notification.save();
          logger.info('✅ Notification sent for failed Facebook token refresh', { userId: bot.userId, botId: bot._id });
        }
      }

      logger.info('⏰ Facebook token refresh check completed successfully.');
    } catch (err) {
      logger.error('❌ Error in Facebook token refresh check', { err });
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

// وظيفة دورية للتحقق من المخزون المنخفض
const checkLowStock = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('⏰ Starting low stock check...');

      const lowStockProducts = await Product.find({
        stock: { $lte: mongoose.Types.Long.fromString('lowStockThreshold') },
        isActive: true
      });

      if (lowStockProducts.length === 0) {
        logger.info('✅ No products found with low stock.');
        return;
      }

      logger.info('🔄 Found products with low stock', { count: lowStockProducts.length });

      for (const product of lowStockProducts) {
        const store = await Store.findById(product.storeId);
        if (!store) {
          logger.warn('⚠️ Store not found for product', { storeId: product.storeId, productId: product._id });
          continue;
        }

        const notification = new Notification({
          user: store.userId,
          title: `انخفاض مخزون ${product.productName}`,
          message: `المنتج ${product.productName} في متجر ${store.storeName} وصل إلى المخزون المنخفض (${product.stock} وحدة). يرجى إعادة تعبئة المخزون.`,
          isRead: false
        });
        await notification.save();
        logger.info('✅ Notification sent for low stock', { userId: store.userId, productId: product._id });
      }

      logger.info('⏰ Low stock check completed successfully.');
    } catch (err) {
      logger.error('❌ Error in low stock check', { err });
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

module.exports = { checkAutoStopBots, refreshInstagramTokens, refreshFacebookTokens, checkLowStock };
