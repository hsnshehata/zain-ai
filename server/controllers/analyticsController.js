const Conversation = require('../models/Conversation');
const Rule = require('../models/Rule');

// Get analytics for a specific bot
exports.getAnalytics = async (req, res) => {
  try {
    const botId = req.query.botId;
    if (!botId) {
      return res.status(400).json({ message: 'Bot ID is required' });
    }

    // Count total messages for the bot
    const conversations = await Conversation.find({ botId });
    let messagesCount = 0;
    conversations.forEach(conversation => {
      messagesCount += conversation.messages.length;
    });

    // Calculate success rate (assuming assistant messages are successful responses)
    let assistantMessages = 0;
    conversations.forEach(conversation => {
      assistantMessages += conversation.messages.filter(msg => msg.role === 'assistant').length;
    });
    const successRate = messagesCount > 0 ? Math.round((assistantMessages / messagesCount) * 100) : 0;

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
