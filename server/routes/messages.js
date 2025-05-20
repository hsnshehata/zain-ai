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
    const accessToken = platform === 'facebook' ? bot.facebookApiKey : bot.instagramApiKey;
    if (!accessToken) {
      throw new Error(`لم يتم العثور على access token لـ ${platform} لهذا البوت`);
    }

    // نزيل البادئة (facebook_, facebook_comment_, instagram_, instagram_comment_)
    const cleanUserId = userId.replace(/^(facebook_|facebook_comment_|instagram_|instagram_comment_)/, '');
    const apiUrl = platform === 'facebook' 
      ? `https://graph.facebook.com/v22.0/${cleanUserId}`
      : `https://graph.instagram.com/v22.0/${cleanUserId}`;
    const response = await new Promise((resolve, reject) => {
      request(
        {
          uri: apiUrl,
          qs: { access_token: accessToken, fields: 'name' },
          method: 'GET',
        },
        (err, res, body) => {
          if (err) return reject(err);
          resolve(JSON.parse(body));
        }
      );
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.name || userId;
  } catch (err) {
    console.error(`❌ خطأ في جلب اسم المستخدم ${userId} من ${platform}:`, err.message);
    return userId;
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
        username = await getSocialUsername(conv.userId, bot, 'facebook');
      } else if (type === 'instagram' && bot.instagramApiKey) {
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

    const accessToken = platform === 'facebook' ? bot.facebookApiKey : bot.instagramApiKey;
    if (!accessToken) {
      throw new Error(`لم يتم العثور على access token لـ ${platform} لهذا البوت`);
    }

    // نزيل البادئة (facebook_, facebook_comment_, instagram_, instagram_comment_)
    const cleanUserId = userId.replace(/^(facebook_|facebook_comment_|instagram_|instagram_comment_)/, '');
    const response = await new Promise((resolve, reject) => {
      request(
        {
          uri: platform === 'facebook' 
            ? `https://graph.facebook.com/v22.0/${cleanUserId}`
            : `https://graph.instagram.com/v22.0/${cleanUserId}`,
          qs: { access_token: accessToken, fields: 'name' },
          method: 'GET',
        },
        (err, res, body) => {
          if (err) return reject(err);
          resolve(JSON.parse(body));
        }
      );
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    res.status(200).json({ name: response.name });
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
