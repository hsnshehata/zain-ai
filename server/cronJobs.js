const cron = require('node-cron');
const Bot = require('./models/Bot');
const Notification = require('./models/Notification');
const Product = require('./models/Product');
const Store = require('./models/Store');
const axios = require('axios');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// دالة للتحقق من صلاحية التوكين
const isTokenValid = async (accessToken, pageId) => {
  try {
    await axios.get(`https://graph.facebook.com/v20.0/${pageId}?fields=id&access_token=${accessToken}`);
    console.log(`[${getTimestamp()}] ✅ Token is valid for page ${pageId}`);
    return true;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Token validation failed for page ${pageId}:`, err.response?.data || err.message);
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
      console.log(`[${getTimestamp()}] ✅ Successfully converted/renewed Facebook token: ${response.data.access_token.slice(0, 10)}...`);
      return response.data.access_token;
    }
    throw new Error('Failed to convert/renew token: No access_token in response');
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error converting/renewing Facebook token:`, err.response?.data || err.message);
    throw err;
  }
};

// وظيفة دورية للتحقق من تاريخ الإيقاف التلقائي
const checkAutoStopBots = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`[${getTimestamp()}] ⏰ Starting auto-stop bot check...`);
      const currentDate = new Date();

      const expiredBots = await Bot.find({
        isActive: true,
        autoStopDate: { $ne: null, $lte: currentDate }
      });

      if (expiredBots.length === 0) {
        console.log(`[${getTimestamp()}] ✅ No bots found with expired subscriptions.`);
        return;
      }

      const updateResult = await Bot.updateMany(
        {
          _id: { $in: expiredBots.map(bot => bot._id) },
          isActive: true
        },
        { $set: { isActive: false } }
      );

      console.log(`[${getTimestamp()}] ✅ Updated ${updateResult.modifiedCount} bots to inactive due to expired subscriptions.`);

      for (const bot of expiredBots) {
        const notification = new Notification({
          user: bot.userId,
          title: `توقف البوت ${bot.name}`,
          message: `البوت ${bot.name} توقف تلقائيًا بسبب انتهاء الاشتراك بتاريخ ${new Date(bot.autoStopDate).toLocaleDateString('ar-EG')}. يمكنك تجديد الاشتراك من لوحة التحكم.`,
          isRead: false
        });
        await notification.save();
        console.log(`[${getTimestamp()}] ✅ Notification sent to user ${bot.userId} for bot ${bot.name}.`);
      }

      console.log(`[${getTimestamp()}] ⏰ Auto-stop bot check completed successfully.`);
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Error in auto-stop bot check:`, err.message, err.stack);
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

// وظيفة دورية لتجديد توكنات إنستجرام
const refreshInstagramTokens = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`[${getTimestamp()}] ⏰ Starting Instagram token refresh check...`);

      const botsWithInstagram = await Bot.find({
        instagramApiKey: { $ne: null },
        instagramPageId: { $ne: null }
      });

      if (botsWithInstagram.length === 0) {
        console.log(`[${getTimestamp()}] ✅ No bots found with Instagram tokens to refresh.`);
        return;
      }

      console.log(`[${getTimestamp()}] 🔄 Found ${botsWithInstagram.length} bots with Instagram tokens to refresh.`);

      const fiftyDaysInMs = 50 * 24 * 60 * 60 * 1000;
      const currentDate = new Date();

      for (const bot of botsWithInstagram) {
        try {
          const lastRefresh = bot.lastInstagramTokenRefresh ? new Date(bot.lastInstagramTokenRefresh) : null;
          const shouldRefresh = !lastRefresh || (currentDate - lastRefresh) >= fiftyDaysInMs;

          if (!shouldRefresh) {
            console.log(`[${getTimestamp()}] ⏳ Skipping token refresh for bot ${bot._id} | Last refreshed: ${lastRefresh.toISOString()}`);
            continue;
          }

          const currentToken = bot.instagramApiKey;
          console.log(`[${getTimestamp()}] 🔄 Attempting to refresh Instagram token for bot ${bot._id}...`);

          const refreshResponse = await axios.get(
            `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
          );

          if (!refreshResponse.data.access_token) {
            console.error(`[${getTimestamp()}] ❌ Failed to refresh Instagram token for bot ${bot._id}:`, refreshResponse.data);
            const notification = new Notification({
              user: bot.userId,
              title: `فشل تجديد توكن إنستجرام للبوت ${bot.name}`,
              message: `فشل في تجديد توكن إنستجرام للبوت ${bot.name}. يرجى إعادة ربط الحساب من لوحة التحكم.`,
              isRead: false
            });
            await notification.save();
            console.log(`[${getTimestamp()}] ✅ Notification sent to user ${bot.userId} for failed token refresh.`);
            continue;
          }

          const newToken = refreshResponse.data.access_token;
          const expiresIn = refreshResponse.data.expires_in;

          bot.instagramApiKey = newToken;
          bot.lastInstagramTokenRefresh = new Date();
          await bot.save();

          console.log(`[${getTimestamp()}] ✅ Successfully refreshed Instagram token for bot ${bot._id} | New Token: ${newToken.slice(0, 10)}... | Expires In: ${expiresIn} seconds`);
        } catch (err) {
          console.error(`[${getTimestamp()}] ❌ Error refreshing Instagram token for bot ${bot._id}:`, err.message, err.response?.data);
          const notification = new Notification({
            user: bot.userId,
            title: `فشل تجديد توكن إنستجرام للبوت ${bot.name}`,
            message: `فشل في تجديد توكن إنستجرام للبوت ${bot.name}. يرجى إعادة ربط الحساب من لوحة التحكم.`,
            isRead: false
          });
          await notification.save();
          console.log(`[${getTimestamp()}] ✅ Notification sent to user ${bot.userId} for failed token refresh.`);
        }
      }

      console.log(`[${getTimestamp()}] ⏰ Instagram token refresh check completed successfully.`);
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Error in Instagram token refresh check:`, err.message, err.stack);
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

// وظيفة دورية لتجديد توكنات فيسبوك
const refreshFacebookTokens = () => {
  cron.schedule('0 0 * * 0', async () => {
    try {
      console.log(`[${getTimestamp()}] ⏰ Starting Facebook token refresh check...`);

      const botsWithFacebook = await Bot.find({
        facebookApiKey: { $ne: null },
        facebookPageId: { $ne: null }
      });

      if (botsWithFacebook.length === 0) {
        console.log(`[${getTimestamp()}] ✅ No bots found with Facebook tokens to refresh.`);
        return;
      }

      console.log(`[${getTimestamp()}] 🔄 Found ${botsWithFacebook.length} bots with Facebook tokens to refresh.`);

      const fiftyDaysInMs = 50 * 24 * 60 * 60 * 1000;
      const currentDate = new Date();

      for (const bot of botsWithFacebook) {
        try {
          const lastRefresh = bot.lastFacebookTokenRefresh ? new Date(bot.lastFacebookTokenRefresh) : null;
          const shouldRefresh = !lastRefresh || (currentDate - lastRefresh) >= fiftyDaysInMs;

          if (!shouldRefresh) {
            console.log(`[${getTimestamp()}] ⏳ Skipping token refresh for bot ${bot._id} | Last refreshed: ${lastRefresh.toISOString()}`);
            continue;
          }

          const currentToken = bot.facebookApiKey;
          console.log(`[${getTimestamp()}] 🔄 Attempting to validate Facebook token for bot ${bot._id}...`);

          // التحقق من صلاحية التوكين
          const isValid = await isTokenValid(currentToken, bot.facebookPageId);
          if (isValid) {
            console.log(`[${getTimestamp()}] ✅ Token for bot ${bot._id} is still valid, no refresh needed`);
            continue;
          }

          console.log(`[${getTimestamp()}] ⚠️ Token for bot ${bot._id} is invalid, attempting to refresh...`);
          const newToken = await convertToLongLivedToken(currentToken);

          bot.facebookApiKey = newToken;
          bot.lastFacebookTokenRefresh = new Date();
          await bot.save();

          console.log(`[${getTimestamp()}] ✅ Successfully refreshed Facebook token for bot ${bot._id} | New Token: ${newToken.slice(0, 10)}...`);
        } catch (err) {
          console.error(`[${getTimestamp()}] ❌ Error refreshing Facebook token for bot ${bot._id}:`, err.message, err.response?.data);
          const notification = new Notification({
            user: bot.userId,
            title: `فشل تجديد توكن فيسبوك للبوت ${bot.name}`,
            message: `فشل في تجديد توكن فيسبوك للبوت ${bot.name}. يرجى إعادة ربط الحساب من لوحة التحكم.`,
            isRead: false
          });
          await notification.save();
          console.log(`[${getTimestamp()}] ✅ Notification sent to user ${bot.userId} for failed token refresh.`);
        }
      }

      console.log(`[${getTimestamp()}] ⏰ Facebook token refresh check completed successfully.`);
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Error in Facebook token refresh check:`, err.message, err.stack);
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

// وظيفة دورية للتحقق من المخزون المنخفض
const checkLowStock = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`[${getTimestamp()}] ⏰ Starting low stock check...`);

      const lowStockProducts = await Product.find({
        stock: { $lte: mongoose.Types.Long.fromString('lowStockThreshold') },
        isActive: true
      });

      if (lowStockProducts.length === 0) {
        console.log(`[${getTimestamp()}] ✅ No products found with low stock.`);
        return;
      }

      console.log(`[${getTimestamp()}] 🔄 Found ${lowStockProducts.length} products with low stock.`);

      for (const product of lowStockProducts) {
        const store = await Store.findById(product.storeId);
        if (!store) {
          console.log(`[${getTimestamp()}] ⚠️ Store ${product.storeId} not found for product ${product._id}`);
          continue;
        }

        const notification = new Notification({
          user: store.userId,
          title: `انخفاض مخزون ${product.productName}`,
          message: `المنتج ${product.productName} في متجر ${store.storeName} وصل إلى المخزون المنخفض (${product.stock} وحدة). يرجى إعادة تعبئة المخزون.`,
          isRead: false
        });
        await notification.save();
        console.log(`[${getTimestamp()}] ✅ Notification sent to user ${store.userId} for low stock of product ${product._id}`);
      }

      console.log(`[${getTimestamp()}] ⏰ Low stock check completed successfully.`);
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Error in low stock check:`, err.message, err.stack);
    }
  }, {
    timezone: 'Africa/Cairo'
  });
};

module.exports = { checkAutoStopBots, refreshInstagramTokens, refreshFacebookTokens, checkLowStock };
