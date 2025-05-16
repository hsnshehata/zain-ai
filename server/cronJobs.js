const cron = require('node-cron');
const Bot = require('./models/Bot');
const Notification = require('./models/Notification');
const axios = require('axios');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// وظيفة دورية للتحقق من تاريخ الإيقاف التلقائي
const checkAutoStopBots = () => {
  // جدولة المهمة لتعمل كل يوم الساعة 12:00 صباحًا
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`[${getTimestamp()}] ⏰ Starting auto-stop bot check...`);
      const currentDate = new Date();

      // جلب البوتات النشطة اللي اشتراكها خلّص
      const expiredBots = await Bot.find({
        isActive: true,
        autoStopDate: { $ne: null, $lte: currentDate }
      });

      if (expiredBots.length === 0) {
        console.log(`[${getTimestamp()}] ✅ No bots found with expired subscriptions.`);
        return;
      }

      // تحديث حالة البوتات إلى متوقفة
      const updateResult = await Bot.updateMany(
        {
          _id: { $in: expiredBots.map(bot => bot._id) },
          isActive: true
        },
        { $set: { isActive: false } }
      );

      console.log(`[${getTimestamp()}] ✅ Updated ${updateResult.modifiedCount} bots to inactive due to expired subscriptions.`);

      // إنشاء إشعارات للمستخدمين
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
  });
};

// وظيفة دورية لتجديد توكنات إنستجرام
const refreshInstagramTokens = () => {
  // جدولة المهمة لتعمل كل 50 يوم الساعة 12:00 صباحًا
  cron.schedule('0 0 1 */50 *', async () => {
    try {
      console.log(`[${getTimestamp()}] ⏰ Starting Instagram token refresh check...`);

      // جلب البوتات اللي عندها توكن إنستجرام
      const botsWithInstagram = await Bot.find({
        instagramApiKey: { $ne: null },
        instagramPageId: { $ne: null }
      });

      if (botsWithInstagram.length === 0) {
        console.log(`[${getTimestamp()}] ✅ No bots found with Instagram tokens to refresh.`);
        return;
      }

      console.log(`[${getTimestamp()}] 🔄 Found ${botsWithInstagram.length} bots with Instagram tokens to refresh.`);

      // تجديد التوكن لكل بوت
      for (const bot of botsWithInstagram) {
        try {
          const currentToken = bot.instagramApiKey;
          console.log(`[${getTimestamp()}] 🔄 Attempting to refresh Instagram token for bot ${bot._id}...`);

          // طلب تجديد التوكن
          const refreshResponse = await axios.get(
            `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
          );

          if (!refreshResponse.data.access_token) {
            console.error(`[${getTimestamp()}] ❌ Failed to refresh Instagram token for bot ${bot._id}:`, refreshResponse.data);
            // إنشاء إشعار للمستخدم
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

          // تحديث التوكن في البوت
          bot.instagramApiKey = newToken;
          await bot.save();

          console.log(`[${getTimestamp()}] ✅ Successfully refreshed Instagram token for bot ${bot._id} | New Token: ${newToken.slice(0, 10)}... | Expires In: ${expiresIn} seconds`);
        } catch (err) {
          console.error(`[${getTimestamp()}] ❌ Error refreshing Instagram token for bot ${bot._id}:`, err.message, err.response?.data);
          // إنشاء إشعار للمستخدم
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
  });
};

module.exports = { checkAutoStopBots, refreshInstagramTokens };
