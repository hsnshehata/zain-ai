const { v4: uuidv4 } = require('uuid');
const ChatPage = require('../models/ChatPage');

// Create a new chat page
exports.createChatPage = async (req, res) => {
  try {
    const { userId, botId } = req.body;
    if (!userId || !botId) {
      return res.status(400).json({ message: 'User ID and Bot ID are required' });
    }

    const linkId = uuidv4(); // Generate unique link ID
    const chatPage = new ChatPage({
      userId,
      botId,
      linkId,
    });

    await chatPage.save();

    // Generate the full link (e.g., http://YOUR_RENDER_URL/chat/YOUR_LINK_ID)
    const chatLink = `${process.env.APP_URL || 'http://localhost:5000'}/chat/${linkId}`;

    res.status(201).json({ link: chatLink, chatPageId: chatPage._id });
  } catch (err) {
    console.error('Error creating chat page:', err);
    res.status(500).json({ message: 'Server error while creating chat page' });
  }
};
