const { v4: uuidv4 } = require('uuid');
const ChatPage = require('../models/ChatPage');

// Create a new chat page
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

// Update chat page settings
exports.updateChatPage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      colors,
      logoUrl,
      suggestedQuestionsEnabled,
      suggestedQuestions,
      imageUploadEnabled,
      darkModeEnabled,
    } = req.body;

    const chatPage = await ChatPage.findById(id);
    if (!chatPage) {
      return res.status(404).json({ message: 'Chat page not found' });
    }

    chatPage.title = title || chatPage.title;
    chatPage.colors = colors || chatPage.colors;
    chatPage.logoUrl = logoUrl || chatPage.logoUrl;
    chatPage.suggestedQuestionsEnabled = suggestedQuestionsEnabled !== undefined ? suggestedQuestionsEnabled : chatPage.suggestedQuestionsEnabled;
    chatPage.suggestedQuestions = suggestedQuestions || chatPage.suggestedQuestions;
    chatPage.imageUploadEnabled = imageUploadEnabled !== undefined ? imageUploadEnabled : chatPage.imageUploadEnabled;
    chatPage.darkModeEnabled = darkModeEnabled !== undefined ? darkModeEnabled : chatPage.darkModeEnabled;

    await chatPage.save();

    res.status(200).json({ message: 'Chat page settings updated successfully' });
  } catch (err) {
    console.error('Error updating chat page:', err);
    res.status(500).json({ message: 'Server error while updating chat page' });
  }
};
