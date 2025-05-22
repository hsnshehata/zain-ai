const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Bot = require('../models/Bot');
const authenticate = require('../middleware/authenticate');
const request = require('request');
const messagesController = require('../controllers/messagesController');

// دالة لجلب اسم المستخدم من فيسبوك أو إنستجرام
async function getSocialUsername(userId, bot, platform) {
  try {
    let accessToken = platform === 'facebook' ? bot.facebookApiKey : bot.instagramApiKey;
    let apiUrl = platform === 'facebook' ? 'https://graph.facebook.com/v22.0' : 'https://graph.instagram.com/v22.0';
    let attempt = platform === 'facebook' ? 'فيسبوك (المحاولة الأولى)' : 'إنستجرام';

    console.log(`📋 جلب التوكن لـ ${attempt} | Bot ID: ${bot._id} | Token: ${accessToken ? accessToken.slice(0, 10) + '...' : 'غير موجود'}`);

    if (!accessToken) {
      console.error(`❌ لم يتم العثور على access token لـ ${attempt} لهذا البوت ${bot._id}`);
      if (platform === 'facebook') {
        // جرب إنستجرام كمحاولة ثانية
        console.log(`📋 محاولة جلب الاسم باستخدام توكن إنستجرام كبديل...`);
        accessToken = bot.instagramApiKey;
        apiUrl = 'https://graph.instagram.com/v22.0';
        attempt = 'إنستجرام (المحاولة الثانية)';
        if (!accessToken) {
          console.error(`❌ لم يتم العثور على توكن إنستجرام أيضاً لهذا البوت ${bot._id}`);
          return 'مستخدم فيسبوك';
        }
      } else {
        return 'مستخدم فيسبوك';
      }
    }

    // تنظيف المعرف
    let cleanUserId = userId.replace(/^(facebook_|facebook_comment_|instagram_|instagram_comment_)/, '');
    cleanUserId = cleanUserId.replace(/^comment_/, '');
    console.log(`📋 جلب اسم المستخدم لـ ${userId}, بعد التنظيف: ${cleanUserId}, المحاولة: ${attempt}`);

    // طلب جلب الاسم
    const response = await new Promise((resolve, reject) => {
      request(
        {
          uri: `${apiUrl}/${cleanUserId}`,
          qs: { access_token: accessToken, fields: 'name' },
          method: 'GET',
        },
        (err, res, body) => {
          if (err) {
            console.error(`❌ خطأ في طلب API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`, err.message);
            return reject(err);
          }
          resolve(JSON.parse(body));
        }
      );
    });

    if (response.error) {
      console.error(`❌ خطأ في استجابة API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`, response.error.message);
      if (platform === 'facebook' && attempt === 'فيسبوك (المحاولة الأولى)') {
        // جرب إنستجرام كمحاولة ثانية
        console.log(`📋 محاولة جلب الاسم باستخدام توكن إنستجرام كبديل...`);
        accessToken = bot.instagramApiKey;
        apiUrl = 'https://graph.instagram.com/v22.0';
        attempt = 'إنستجرام (المحاولة الثانية)';
        if (!accessToken) {
          console.error(`❌ لم يتم العثور على توكن إنستجرام لهذا البوت ${bot._id}`);
          return 'مستخدم فيسبوك';
        }

        const retryResponse = await new Promise((resolve, reject) => {
          request(
            {
              uri: `${apiUrl}/${cleanUserId}`,
              qs: { access_token: accessToken, fields: 'name' },
              method: 'GET',
            },
            (err, res, body) => {
              if (err) {
                console.error(`❌ خطأ في طلب API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`, err.message);
                return reject(err);
              }
              resolve(JSON.parse(body));
            }
          );
        });

        if (retryResponse.error) {
          console.error(`❌ خطأ في استجابة API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`, retryResponse.error.message);
          return 'مستخدم فيسبوك';
        }

        console.log(`✅ تم جلب الاسم بنجاح لـ ${cleanUserId} في ${attempt}: ${retryResponse.name}`);
        return retryResponse.name || 'مستخدم فيسبوك';
      }
      return 'مستخدم فيسبوك';
    }

    console.log(`✅ تم جلب الاسم بنجاح لـ ${cleanUserId} في ${attempt}: ${response.name}`);
    return response.name || 'مستخدم فيسبوك';
  } catch (err) {
    console.error(`❌ خطأ في جلب اسم المستخدم ${userId} من ${platform}:`, err.message);
    return 'مستخدم فيسبوك';
  }
}

// Get conversations for a bot
router.get('/:botId', authenticate, async (req, res) => {
  try {
    const { botId } = req.params;
    const { type, startDate, endDate } = req.query;

    let query = { botId };
    if (type === 'facebook') {
      query.userId = { $regex: '^(facebook_|facebook_comment_)' };
    } else if (type === 'web') {
      query.userId = { $in: ['anonymous', /^web_/] };
    } else if (type === 'instagram') {
      query.userId = { $regex: '^(instagram_|instagram_comment_)' };
    }

    if (startDate || endDate) {
      query['messages.timestamp'] = {};
      if (startDate) query['messages.timestamp'].$gte = new Date(startDate);
      if (endDate) query['messages.timestamp'].$lte = new Date(endDate);
    }

    const conversations = await Conversation.find(query);

    // جلب البوت من قاعدة البيانات
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new Error('البوت غير موجود');
    }

    // إضافة الـ username لكل محادثة
    const conversationsWithUsernames = await Promise.all(conversations.map(async (conv) => {
      let username = conv.userId;
      if (type === 'facebook' && bot.facebookApiKey) {
        console.log(`📋 محاولة جلب اسم المستخدم لـ ${conv.userId} من فيسبوك`);
        username = await getSocialUsername(conv.userId, bot, 'facebook');
      } else if (type === 'instagram' && bot.instagramApiKey) {
        console.log(`📋 محاولة جلب اسم المستخدم لـ ${conv.userId} من إنستجرام`);
        username = await getSocialUsername(conv.userId, bot, 'instagram');
      }
      return { ...conv._doc, username };
    }));

    res.status(200).json(conversationsWithUsernames);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Get daily messages for a bot
router.get('/daily/:botId', authenticate, messagesController.getDailyMessages);

// Get social user name
router.get('/social-user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { botId, platform } = req.query;

    if (!botId || !platform) {
      throw new Error('يرجى تحديد botId وplatform في الطلب');
    }

    if (!['facebook', 'instagram'].includes(platform)) {
      throw new Error('المنصة يجب أن تكون facebook أو instagram');
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new Error('البوت غير موجود');
    }

    const username = await getSocialUsername(userId, bot, platform);
    res.status(200).json({ name: username });
  } catch (err) {
    console.error('Error fetching social user:', err);
    res.status(500).json({ message: 'خطأ في جلب اسم المستخدم' });
  }
});

// Delete a single message
router.delete('/delete-message/:botId/:userId/:messageId', authenticate, async (req, res) => {
  try {
    const { botId, userId, messageId } = req.params;
    const { type } = req.query;

    let query = { botId, userId };
    if (type === 'facebook') {
      query.userId = { $regex: '^(facebook_|facebook_comment_)' };
    } else if (type === 'web') {
      query.userId = { $in: ['anonymous', /^web_/] };
    } else if (type === 'instagram') {
      query.userId = { $regex: '^(instagram_|instagram_comment_)' };
    }

    const conversation = await Conversation.findOne(query);
    if (!conversation) {
      return res.status(404).json({ message: 'المحادثة غير موجودة' });
    }

    conversation.messages = conversation.messages.filter(msg => msg._id.toString() !== messageId);
    await conversation.save();

    res.status(200).json({ message: 'تم حذف الرسالة بنجاح' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Delete a single conversation by conversationId
router.delete('/delete-conversation/:botId/:conversationId', authenticate, async (req, res) => {
  try {
    const { botId, conversationId } = req.params;

    const result = await Conversation.deleteOne({ botId, _id: conversationId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'المحادثة غير موجودة' });
    }

    res.status(200).json({ message: 'تم حذف المحادثة بنجاح' });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Delete a user's conversations
router.delete('/delete-user/:botId/:userId', authenticate, async (req, res) => {
  try {
    const { botId, userId } = req.params;
    const { type } = req.query;

    let query = { botId, userId };
    if (type === 'facebook') {
      query.userId = { $regex: '^(facebook_|facebook_comment_)' };
    } else if (type === 'web') {
      query.userId = { $in: ['anonymous', /^web_/] };
    } else if (type === 'instagram') {
      query.userId = { $regex: '^(instagram_|instagram_comment_)' };
    }

    await Conversation.deleteMany(query);
    res.status(200).json({ message: 'تم حذف المستخدم ومحادثاته بنجاح' });
  } catch (err) {
    console.error('Error deleting user conversations:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Delete all conversations for a bot
router.delete('/delete-all/:botId', authenticate, async (req, res) => {
  try {
    const { botId } = req.params;
    const { type } = req.query;

    let query = { botId };
    if (type === 'facebook') {
      query.userId = { $regex: '^(facebook_|facebook_comment_)' };
    } else if (type === 'web') {
      query.userId = { $in: ['anonymous', /^web_/] };
    } else if (type === 'instagram') {
      query.userId = { $regex: '^(instagram_|instagram_comment_)' };
    }

    await Conversation.deleteMany(query);
    res.status(200).json({ message: 'تم حذف كل المحادثات بنجاح' });
  } catch (err) {
    console.error('Error deleting all conversations:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Download all messages
router.get('/download/:botId', authenticate, async (req, res) => {
  try {
    const { botId } = req.params;
    const { type } = req.query;

    let query = { botId };
    if (type === 'facebook') {
      query.userId = { $regex: '^(facebook_|facebook_comment_)' };
    } else if (type === 'web') {
      query.userId = { $in: ['anonymous', /^web_/] };
    } else if (type === 'instagram') {
      query.userId = { $regex: '^(instagram_|instagram_comment_)' };
    }

    const conversations = await Conversation.find(query);
    let textContent = '';

    for (const conv of conversations) {
      textContent += `User ID: ${conv.userId}\n`;
      conv.messages.forEach(msg => {
        textContent += `${msg.role === 'user' ? 'User' : 'Bot'} (${new Date(msg.timestamp).toLocaleString('ar-EG')}): ${msg.content}\n`;
      });
      textContent += '-------------------------\n';
    }

    res.set('Content-Type', 'text/plain');
    res.send(textContent);
  } catch (err) {
    console.error('Error downloading messages:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
