const { v4: uuidv4 } = require('uuid');
const ChatPage = require('../models/ChatPage');

exports.createChatPage = async (req, res) => {
  try {
    const { userId, botId } = req.body;
    if (!userId || !botId) {
      return res.status(400).json({ message: 'User ID and Bot ID are required' });
    }

    const linkId = uuidv4();
    const chatPage = new ChatPage({
      userId,
      botId,
      linkId,
    });

    await chatPage.save();

    const chatLink = `${process.env.APP_URL || 'https://zain-ai-a06a.onrender.com'}/chat/${linkId}`;

    res.status(201).json({ link: chatLink, chatPageId: chatPage._id });
  } catch (err) {
    console.error('Error creating chat page:', err);
    res.status(500).json({ message: 'Server error while creating chat page' });
  }
};
