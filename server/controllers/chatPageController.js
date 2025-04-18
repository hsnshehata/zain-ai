const { v4: uuidv4 } = require('uuid');
const ChatPage = require('../models/ChatPage');

// Create a new chat page
exports.createChatPage = async (req, res) => {
  try {
    const { userId, botId } = req.body;
    if (!userId || !botId) {
      return res.status(400).json({ message: 'User ID and Bot ID are required' });
    }

    // Check if a chat page already exists for this bot
    const existingPage = await ChatPage.findOne({ botId });
    if (existingPage) {
      const chatLink = `${process.env.APP_URL || 'https://zain-ai-a06a.onrender.com'}/chat/${existingPage.linkId}`;
      return res.status(200).json({ link: chatLink, chatPageId: existingPage._id, exists: true });
    }

    const linkId = uuidv4();
    const chatPage = new ChatPage({
      userId,
      botId,
      linkId,
    });

    await chatPage.save();

    const chatLink = `${process.env.APP_URL || 'https://zain-ai-a06a.onrender.com'}/chat/${linkId}`;

    res.status(201).json({ link: chatLink, chatPageId: chatPage._id, exists: false });
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

// Get chat page settings by linkId
exports.getChatPageByLinkId = async (req, res) => {
  try {
    const { linkId } = req.params;
    const chatPage = await ChatPage.findOne({ linkId }).populate('botId');
    if (!chatPage) {
      return res.status(404).json({ message: 'Chat page not found' });
    }
    res.status(200).json({
      title: chatPage.title,
      colors: chatPage.colors,
      logoUrl: chatPage.logoUrl,
      suggestedQuestionsEnabled: chatPage.suggestedQuestionsEnabled,
      suggestedQuestions: chatPage.suggestedQuestions,
      imageUploadEnabled: chatPage.imageUploadEnabled,
      darkModeEnabled: chatPage.darkModeEnabled,
      botId: chatPage.botId._id,
    });
  } catch (err) {
    console.error('Error fetching chat page:', err);
    res.status(500).json({ message: 'Server error while fetching chat page' });
  }
};

// Get chat page settings by botId
exports.getChatPageByBotId = async (req, res) => {
  try {
    const { botId } = req.params;
    const chatPage = await ChatPage.findOne({ botId });
    if (!chatPage) {
      return res.status(404).json({ message: 'No chat page found for this bot' });
    }
    const chatLink = `${process.env.APP_URL || 'https://zain-ai-a06a.onrender.com'}/chat/${chatPage.linkId}`;
    res.status(200).json({
      link: chatLink,
      chatPageId: chatPage._id,
      title: chatPage.title,
      colors: chatPage.colors,
      logoUrl: chatPage.logoUrl,
      suggestedQuestionsEnabled: chatPage.suggestedQuestionsEnabled,
      suggestedQuestions: chatPage.suggestedQuestions,
      imageUploadEnabled: chatPage.imageUploadEnabled,
      darkModeEnabled: chatPage.darkModeEnabled,
    });
  } catch (err) {
    console.error('Error fetching chat page by botId:', err);
    res.status(500).json({ message: 'Server error while fetching chat page' });
  }
};
