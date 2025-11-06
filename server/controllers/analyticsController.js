const Conversation = require('../models/Conversation');
const Rule = require('../models/Rule');

// Get analytics for a specific bot
exports.getAnalytics = async (req, res) => {
  try {
    const botId = req.query.botId;
    if (!botId) {
      return res.status(400).json({ message: 'Bot ID is required' });
    }

    // Get all conversations for the bot
    const conversations = await Conversation.find({ botId });

    // Use a Set to avoid counting duplicate messages
    const uniqueMessages = new Set();
    conversations.forEach(conversation => {
      conversation.messages.forEach(msg => {
        // Use messageId if available, otherwise fall back to content-timestamp-role
        const messageKey = msg.messageId || `${msg.content}-${msg.timestamp}-${msg.role}`;
        uniqueMessages.add(messageKey);
      });
    });
    const messagesCount = uniqueMessages.size;

    // Count successful assistant messages (non-empty and not error messages)
    let successfulMessages = 0;
    conversations.forEach(conversation => {
      conversation.messages.forEach(msg => {
        const messageKey = msg.messageId || `${msg.content}-${msg.timestamp}-${msg.role}`;
        if (
          msg.role === 'assistant' &&
          msg.content &&
          msg.content.trim() !== '' &&
          !msg.content.includes('عذرًا، حدث خطأ') &&
          !uniqueMessages.has(messageKey)
        ) {
          uniqueMessages.add(messageKey);
          successfulMessages++;
        }
      });
    });
    const successRate = messagesCount > 0 ? Math.round((successfulMessages / messagesCount) * 100) : 0;

    // Count active rules for the bot
    const activeRules = await Rule.countDocuments({ botId });

    res.status(200).json({
      messagesCount,
      successRate,
      activeRules
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
};
