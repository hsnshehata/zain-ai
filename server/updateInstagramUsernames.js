const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
const Bot = require('./models/Bot');
const axios = require('axios');
require('dotenv').config();

// دالة لتوصيل قاعدة البيانات (نفس طريقة db.js)
const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI مش موجود في الـ environment variables. راجع إعدادات Render Dashboard.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB متّصل بنجاح');
  } catch (err) {
    console.error('❌ خطأ في التوصيل بـ MongoDB:', err.message, err.stack);
    process.exit(1);
  }
};

// دالة لتحديث أسماء المستخدمين
async function updateInstagramUsernames() {
  try {
    // جلب البوتات اللي عندها instagramApiKey
    const bots = await Bot.find({ instagramApiKey: { $ne: null } });
    console.log(`🔍 لقينا ${bots.length} بوت عندهم instagramApiKey`);

    for (const bot of bots) {
      // جلب كل المحادثات للبوت
      const allConversations = await Conversation.find({ botId: bot._id });
      console.log(`📋 لقينا ${allConversations.length} محادثة كلها للبوت ${bot._id}`);

      // جلب المحادثات اللي userId بيبدأ بـ instagram_
      const instagramConversations = await Conversation.find({
        botId: bot._id,
        userId: { $regex: '^instagram_' },
      });
      console.log(`📋 لقينا ${instagramConversations.length} محادثة بـ userId يبدأ بـ instagram_ للبوت ${bot._id}`);

      // تحديث المحادثات اللي userId بيبدأ بـ instagram_
      for (const conv of instagramConversations) {
        const userId = conv.userId.replace('instagram_', '');
        try {
          const response = await axios.get(
            `https://graph.facebook.com/v20.0/${userId}?fields=username&access_token=${bot.instagramApiKey}`,
            { timeout: 5000 }
          );
          if (response.data.username) {
            conv.username = response.data.username;
            await conv.save();
            console.log(`✅ تم تحديث اسم المستخدم للمحادثة ${conv._id}: ${conv.username}`);
          } else {
            console.log(`⚠️ مفيش username في الـ response لـ ${userId}`);
          }
        } catch (err) {
          console.error(`❌ خطأ في تحديث اسم المستخدم لـ ${conv.userId}:`, err.response?.data?.error?.message || err.message);
        }
      }

      // جلب المحادثات اللي userId ممكن تكون خام (بدون instagram_)
      const rawConversations = await Conversation.find({
        botId: bot._id,
        userId: { $not: { $regex: '^(web_|whatsapp_|instagram_)' }, $ne: 'anonymous' },
      });
      console.log(`📋 لقينا ${rawConversations.length} محادثة بـ userId خام للبوت ${bot._id}`);

      // تحديث المحادثات اللي userId خام
      for (const conv of rawConversations) {
        try {
          const response = await axios.get(
            `https://graph.facebook.com/v20.0/${conv.userId}?fields=username&access_token=${bot.instagramApiKey}`,
            { timeout: 5000 }
          );
          if (response.data.username) {
            conv.username = response.data.username;
            conv.userId = `instagram_${conv.userId}`; // إضافة البادئة
            await conv.save();
            console.log(`✅ تم تحديث اسم المستخدم و userId للمحادثة ${conv._id}: ${conv.username} (userId: ${conv.userId})`);
          } else {
            console.log(`⚠️ مفيش username في الـ response لـ ${conv.userId}`);
          }
        } catch (err) {
          console.error(`❌ خطأ في تحديث اسم المستخدم لـ ${conv.userId}:`, err.response?.data?.error?.message || err.message);
        }
      }
    }

    console.log('🏁 خلّصنا تحديث أسماء المستخدمين بنجاح!');
  } catch (err) {
    console.error('❌ خطأ في الـ script:', err.message, err.stack);
  } finally {
    mongoose.connection.close();
    console.log('🔌 فصلنا عن قاعدة البيانات');
  }
}

// تشغيل الـ Script
connectDB().then(() => {
  updateInstagramUsernames();
}).catch(err => {
  console.error('❌ خطأ في بداية الـ script:', err.message);
  process.exit(1);
});
