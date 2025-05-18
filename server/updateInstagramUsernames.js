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

// دالة لجلب اسم المستخدم من Graph API
async function getUsername(userId, instagramApiKey, facebookApiKey) {
  const apiKeys = [instagramApiKey, facebookApiKey].filter(key => key);
  for (const apiKey of apiKeys) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v20.0/${userId}?fields=username,name&access_token=${apiKey}`,
        { timeout: 5000 }
      );
      return response.data.username || response.data.name || null;
    } catch (err) {
      console.error(`❌ خطأ في جلب اسم المستخدم لـ ${userId} باستخدام ${apiKey.slice(0, 10)}...:`, err.response?.data?.error?.message || err.message);
    }
  }
  return null;
}

// دالة لتحديث أسماء المستخدمين
async function updateInstagramUsernames() {
  try {
    // جلب البوتات اللي عندها instagramApiKey أو facebookApiKey
    const bots = await Bot.find({
      $or: [
        { instagramApiKey: { $ne: null } },
        { facebookApiKey: { $ne: null } },
      ],
    });
    console.log(`🔍 لقينا ${bots.length} بوت عندهم instagramApiKey أو facebookApiKey`);

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
        const username = await getUsername(userId, bot.instagramApiKey, bot.facebookApiKey);
        if (username) {
          conv.username = username;
          await conv.save();
          console.log(`✅ تم تحديث اسم المستخدم للمحادثة ${conv._id}: ${conv.username}`);
        } else {
          console.log(`⚠️ مفيش username لـ ${conv.userId}`);
        }
      }

      // جلب المحادثات اللي userId خام (محتمل إنستجرام أو فيسبوك)
      const rawConversations = await Conversation.find({
        botId: bot._id,
        userId: { $not: { $regex: '^(web_|whatsapp_|instagram_)' }, $ne: 'anonymous' },
      });
      console.log(`📋 لقينا ${rawConversations.length} محادثة بـ userId خام للبوت ${bot._id}`);

      // تحديث المحادثات اللي userId خام
      for (const conv of rawConversations) {
        const username = await getUsername(conv.userId, bot.instagramApiKey, bot.facebookApiKey);
        if (username) {
          // نفترض إن الـ userId ده إنستجرام لو جاب username
          conv.username = username;
          conv.userId = `instagram_${conv.userId}`; // إضافة البادئة
          await conv.save();
          console.log(`✅ تم تحديث اسم المستخدم و userId للمحادثة ${conv._id}: ${conv.username} (userId: ${conv.userId})`);
        } else {
          console.log(`⚠️ مفيش username لـ ${conv.userId}`);
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
