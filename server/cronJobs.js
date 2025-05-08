const cron = require('node-cron');
const Bot = require('./models/Bot');
const Notification = require('./models/Notification');

// وظيفة دورية للتحقق من تاريخ الإيقاف التلقائي
const checkAutoStopBots = () => {
  // جدولة المهمة لتعمل كل يوم الساعة 12:00 صباحًا
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('⏰ Running auto-stop bot check...');
      const currentDate = new Date();
      const bots = await Bot.find({ autoStopDate: { $ne: null } });

      for (const bot of bots) {
        if (bot.autoStopDate && new Date(bot.autoStopDate) <= currentDate && bot.isActive) {
          console.log(`⚠️ Stopping bot ${bot.name} (ID: ${bot._id}) due to autoStopDate: ${bot.autoStopDate}`);
          bot.isActive = false;
          await bot.save();

          // إنشاء إشعار للمستخدم
          const notification = new Notification({
            user: bot.userId,
            title: `توقف البوت ${bot.name}`,
            message: `البوت ${bot.name} توقف تلقائيًا بسبب انتهاء تاريخ الإيقاف في ${new Date(bot.autoStopDate).toLocaleDateString('ar-EG')}`,
            isRead: false
          });
          await notification.save();

          console.log(`✅ Bot ${bot.name} stopped successfully and notification sent to user ${bot.userId}.`);
        }
      }
    } catch (err) {
      console.error('❌ Error in auto-stop bot check:', err.message, err.stack);
    }
  });
};

module.exports = { checkAutoStopBots };
