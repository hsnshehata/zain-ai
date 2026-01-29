const Conversation = require('../models/Conversation');
const Rule = require('../models/Rule');
const ChatOrder = require('../models/ChatOrder');

// Get analytics for a specific bot
exports.getAnalytics = async (req, res) => {
  try {
    const botId = req.query.botId;
    if (!botId) {
      return res.status(400).json({ message: 'Bot ID is required' });
    }

    // إجمالي المحادثات (صفحة الرسائل)
    const conversationsCount = await Conversation.countDocuments({ botId });

    // إجمالي الرسائل الفريدة داخل المحادثات
    const conversations = await Conversation.find({ botId }).select('messages');
    const uniqueMessages = new Set();
    conversations.forEach(conversation => {
      conversation.messages.forEach(msg => {
        const messageKey = msg.messageId || `${msg.content}-${msg.timestamp}-${msg.role}`;
        uniqueMessages.add(messageKey);
      });
    });
    const messagesCount = uniqueMessages.size;

    // عدّاد الطلبات المنشأة من المحادثات
    const chatOrdersCount = await ChatOrder.countDocuments({ botId });

    // Count active rules for the bot
    const activeRules = await Rule.countDocuments({ botId });

    res.status(200).json({
      messagesCount,
      conversationsCount,
      chatOrdersCount,
      activeRules
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
};
