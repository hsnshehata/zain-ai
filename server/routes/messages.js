const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const authenticate = require('../middleware/authenticate');
const request = require('request');
const messagesController = require('../controllers/messagesController');

// دالة لجلب اسم المستخدم من فيسبوك
async function getFacebookUsername(userId) {
  try {
    const response = await new Promise((resolve, reject) => {
      request(
        {
          uri: `https://graph.facebook.com/v22.0/${userId}`,
          qs: { access_token: process.env.FACEBOOK_ACCESS_TOKEN, fields: 'name' },
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

    return response.name || userId; // لو الاسم مش موجود، نرجع الـ userId كحل احتياطي
  } catch (err) {
    console.error(`❌ خطأ في جلب اسم المستخدم ${userId} من فيسبوك:`, err.message);
    return userId; // لو حصل خطأ، نرجع الـ userId
  }
}

// Get conversations for a bot
router.get('/:botId', authenticate, async (req, res) => {
  try {
    const { botId } = req.params;
    const { type, startDate, endDate } = req.query;

    let query = { botId };
    if (type === 'facebook') {
      query.userId = { $nin: ['anonymous', /^whatsapp_/] }; // Exclude anonymous and WhatsApp users
    } else if (type === 'web') {
      query.userId = 'anonymous'; // Only include anonymous users
    } else if (type === 'whatsapp') {
      query.userId = { $regex: '^whatsapp_' }; // Only include WhatsApp users
    }

    if (startDate || endDate) {
      query['messages.timestamp'] = {};
      if (startDate) query['messages.timestamp'].$gte = new Date(startDate);
      if (endDate) query['messages.timestamp'].$lte = new Date(endDate);
    }

    const conversations = await Conversation.find(query);

    // إضافة الـ username لكل محادثة
    const conversationsWithUsernames = await Promise.all(conversations.map(async (conv) => {
      let username = conv.userId; // افتراضي
      if (type === 'facebook') {
        username = await getFacebookUsername(conv.userId);
      }
      return { ...conv._doc, username }; // إضافة الـ username للبيانات
    }));

    res.status(200).json(conversationsWithUsernames);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// Get daily messages for a bot
router.get('/daily/:botId', authenticate, messagesController.getDailyMessages);

// Get Facebook user name
router.get('/facebook-user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await new Promise((resolve, reject) => {
      request(
        {
          uri: `https://graph.facebook.com/v22.0/${userId}`,
          qs: { access_token: process.env.FACEBOOK_ACCESS_TOKEN, fields: 'name' },
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
    console.error('Error fetching Facebook user:', err);
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
      query.userId = { $nin: ['anonymous', /^whatsapp_/] };
    } else if (type === 'web') {
      query.userId = 'anonymous';
    } else if (type === 'whatsapp') {
      query.userId = { $regex: '^whatsapp_' };
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
      query.userId = { $nin: ['anonymous', /^whatsapp_/] };
    } else if (type === 'web') {
      query.userId = 'anonymous';
    } else if (type === 'whatsapp') {
      query.userId = { $regex: '^whatsapp_' };
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
      query.userId = { $nin: ['anonymous', /^whatsapp_/] };
    } else if (type === 'web') {
      query.userId = 'anonymous';
    } else if (type === 'whatsapp') {
      query.userId = { $regex: '^whatsapp_' };
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
      query.userId = { $nin: ['anonymous', /^whatsapp_/] };
    } else if (type === 'web') {
      query.userId = 'anonymous';
    } else if (type === 'whatsapp') {
      query.userId = { $regex: '^whatsapp_' };
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
