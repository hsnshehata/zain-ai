const cron = require('node-cron');
const Bot = require('./models/Bot');
const Notification = require('./models/Notification');

// وظيفة دورية للتحقق من تاريخ الإيقاف التلقائي
const checkAutoStopBots = () => {
  // جدولة المهمة لتعمل كل يوم الساعة 12:00 صباحًا
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('⏰ Starting auto-stop bot check...');
      const currentDate = new Date();

      // جلب البوتات النشطة اللي اشتراكها خلّص
      const expiredBots = await Bot.find({
        isActive: true,
        autoStopDate: { $ne: null, $lte: currentDate }
      });

      if (expiredBots.length === 0) {
        console.log('✅ No bots found with expired subscriptions.');
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

      console.log(`✅ Updated ${updateResult.modifiedCount} bots to inactive due to expired subscriptions.`);

      // إنشاء إشعارات للمستخدمين
      for (const bot of expiredBots) {
        const notification = new Notification({
          user: bot.userId,
          title: `توقف البوت ${bot.name}`,
          message: `البوت ${bot.name} توقف تلقائيًا بسبب انتهاء الاشتراك بتاريخ ${new Date(bot.autoStopDate).toLocaleDateString('ar-EG')}. يمكنك تجديد الاشتراك من لوحة التحكم.`,
          isRead: false
        });
        await notification.save();
        console.log(`✅ Notification sent to user ${bot.userId} for bot ${bot.name}.`);
      }

      console.log('⏰ Auto-stop bot check completed successfully.');
    } catch (err) {
      console.error('❌ Error in auto-stop bot check:', err.message, err.stack);
    }
  });
};

module.exports = { checkAutoStopBots };
