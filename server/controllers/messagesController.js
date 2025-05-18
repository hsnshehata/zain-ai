const Conversation = require('../models/Conversation');
const Bot = require('../models/Bot');
const axios = require('axios');

// دالة مساعدة لجلب اسم المستخدم من فيسبوك/إنستجرام
async function getSocialUsername(userId, bot) {
  try {
    const apiKey = bot.instagramPageId && userId.startsWith('instagram_') ? bot.instagramApiKey : bot.facebookApiKey;
    if (!apiKey) return userId;
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${userId.replace('instagram_', '')}?fields=name&access_token=${apiKey}`
    );
    return response.data.name || userId;
  } catch (err) {
    console.error(`Error fetching username for ${userId}:`, err.message);
    return userId;
  }
}

// Get daily messages for a bot
exports.getDailyMessages = async (req, res) => {
  try {
    const { botId } = req.params;
    const { startDate, endDate, role } = req.query;

    let query = { botId };
    if (startDate || endDate) {
      query['messages.timestamp'] = {};
      if (startDate) query['messages.timestamp'].$gte = new Date(startDate);
      if (endDate) query['messages.timestamp'].$lte = new Date(endDate);
    }
    if (role) {
      query['messages.role'] = role;
    }

    const conversations = await Conversation.find(query);

    const dailyMessages = {};
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (!role || msg.role === role) {
          const date = new Date(msg.timestamp).toISOString().split('T')[0];
          if (!dailyMessages[date]) {
            dailyMessages[date] = 0;
          }
          dailyMessages[date]++;
        }
      });
    });

    const result = Object.keys(dailyMessages)
      .sort()
      .map(date => ({
        date: date,
        count: dailyMessages[date],
      }));

    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching daily messages:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// Get conversations for a bot
exports.getMessages = async (req, res) => {
  try {
    const { botId } = req.params;
    const { type, startDate, endDate } = req.query;

    let query = { botId };
    if (startDate || endDate) {
      query['messages.timestamp'] = {};
      if (startDate) query['messages.timestamp'].$gte = new Date(startDate);
      if (endDate) query['messages.timestamp'].$lte = new Date(endDate);
    }
    if (type) {
      if (type === 'facebook') {
        query.userId = { $not: { $in: [/^web_/, /^whatsapp_/, /^instagram_/] } };
      } else if (type === 'web') {
        query.userId = { $in: ['anonymous', /^web_/] };
      } else if (type === 'whatsapp') {
        query.userId = { $regex: '^whatsapp_' };
      } else if (type === 'instagram') {
        query.userId = { $regex: '^instagram_' };
      }
    }

    const conversations = await Conversation.find(query).lean();
    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({ message: 'البوت غير موجود' });
    }

    const conversationsWithUsernames = await Promise.all(
      conversations.map(async (conv) => {
        let username = conv.userId;
        let messageType = 'message';
        if (conv.userId.startsWith('instagram_') || (!conv.userId.startsWith('web_') && !conv.userId.startsWith('whatsapp_') && conv.userId !== 'anonymous')) {
          username = await getSocialUsername(conv.userId, bot);
        } else if (conv.userId === 'anonymous') {
          username = 'زائر ويب';
        } else if (conv.userId.startsWith('whatsapp_')) {
          const phoneMatch = conv.userId.match(/whatsapp_(\d+)/);
          username = phoneMatch ? `واتساب ${phoneMatch[1]}` : 'مستخدم واتساب';
        }
        if (conv.messages.some(msg => msg.messageId && msg.messageId.startsWith('comment_'))) {
          messageType = 'comment';
        }
        return { ...conv, username, messageType };
      })
    );

    const seenConversations = new Set();
    const uniqueConversations = conversationsWithUsernames.filter(conv => {
      const convKey = conv._id.toString();
      if (seenConversations.has(convKey)) {
        console.log(`⚠️ Duplicate conversation detected: ${convKey}`);
        return false;
      }
      seenConversations.add(convKey);
      return true;
    });

    res.status(200).json(uniqueConversations);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء جلب المحادثات' });
  }
};
