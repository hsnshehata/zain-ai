const { v4: uuidv4 } = require('uuid');
const ChatPage = require('../models/ChatPage');
const axios = require('axios');
const FormData = require('form-data');

// Load environment variables
require('dotenv').config();
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Function to upload image to imgbb using axios
async function uploadToImgbb(file) {
  try {
    // Validate file size (imgbb max size is 32MB)
    const maxSizeInBytes = 32 * 1024 * 1024; // 32MB in bytes
    if (file.size > maxSizeInBytes) {
      throw new Error('حجم الصورة أكبر من الحد الأقصى المسموح (32 ميجابايت)');
    }

    // Validate file type (imgbb accepts PNG, JPG, etc., but we're expecting PNG as per the frontend)
    const allowedTypes = ['image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('نوع الصورة غير مدعوم، يرجى رفع صورة بصيغة PNG');
    }

    const formData = new FormData();
    formData.append('image', file.buffer, file.originalname);
    formData.append('key', IMGBB_API_KEY);

    console.log('📤 Uploading image to imgbb...');
    const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('📥 imgbb response:', response.data);

    if (response.status !== 200 || !response.data.success) {
      throw new Error(`فشل في رفع الصورة إلى imgbb: ${response.data.error?.message || 'خطأ غير معروف'}`);
    }

    return {
      url: response.data.data.url,
      deleteUrl: response.data.data.delete_url,
    };
  } catch (err) {
    console.error('❌ Error uploading to imgbb:', err.message);
    throw err;
  }
}

// Function to delete image from imgbb using axios
async function deleteFromImgbb(deleteUrl) {
  if (!deleteUrl) return;

  try {
    const response = await axios.delete(deleteUrl);
    if (response.status !== 200) {
      console.error(`فشل في حذف الصورة من imgbb: ${response.status} ${response.statusText}`);
    } else {
      console.log('تم حذف الصورة القديمة بنجاح من imgbb');
    }
  } catch (err) {
    console.error('خطأ أثناء حذف الصورة من imgbb:', err);
  }
}

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
    throw err; // Let the global error handler catch it
  }
};

// Update chat page settings
exports.updateChatPage = async (req, res) => {
  try {
    const { id } = req.params;
    const chatPage = await ChatPage.findById(id);
    if (!chatPage) {
      return res.status(404).json({ message: 'Chat page not found' });
    }

    // Parse FormData fields safely
    const title = req.body.title || chatPage.title;
    const titleColor = req.body.titleColor || chatPage.titleColor;
    let colors = chatPage.colors;
    if (req.body.colors) {
      try {
        colors = JSON.parse(req.body.colors);
      } catch (e) {
        console.error('Error parsing colors:', e);
        return res.status(400).json({ message: 'Invalid colors format' });
      }
    }
    const suggestedQuestionsEnabled = req.body.suggestedQuestionsEnabled === 'true' ? true : req.body.suggestedQuestionsEnabled === 'false' ? false : chatPage.suggestedQuestionsEnabled;
    let suggestedQuestions = chatPage.suggestedQuestions;
    if (req.body.suggestedQuestions) {
      try {
        suggestedQuestions = JSON.parse(req.body.suggestedQuestions);
      } catch (e) {
        console.error('Error parsing suggestedQuestions:', e);
        return res.status(400).json({ message: 'Invalid suggestedQuestions format' });
      }
    }
    const imageUploadEnabled = req.body.imageUploadEnabled === 'true' ? true : req.body.imageUploadEnabled === 'false' ? false : chatPage.imageUploadEnabled;
    const darkModeEnabled = req.body.darkModeEnabled === 'true' ? true : req.body.darkModeEnabled === 'false' ? false : chatPage.darkModeEnabled;

    // Handle logo upload to imgbb
    let logoUrl = chatPage.logoUrl;
    let logoDeleteUrl = chatPage.logoDeleteUrl;

    if (req.file) { // Using multer's req.file instead of req.files.logo
      try {
        // Delete the old image from imgbb if it exists
        if (logoDeleteUrl) {
          await deleteFromImgbb(logoDeleteUrl);
        }

        // Upload the new image to imgbb
        const uploadResult = await uploadToImgbb(req.file);
        logoUrl = uploadResult.url;
        logoDeleteUrl = uploadResult.deleteUrl;
      } catch (err) {
        return res.status(500).json({ message: `فشل في رفع الشعار: ${err.message}` });
      }
    }

    // Update chat page
    chatPage.title = title;
    chatPage.titleColor = titleColor;
    chatPage.colors = colors;
    chatPage.logoUrl = logoUrl;
    chatPage.logoDeleteUrl = logoDeleteUrl;
    chatPage.suggestedQuestionsEnabled = suggestedQuestionsEnabled;
    chatPage.suggestedQuestions = suggestedQuestions;
    chatPage.imageUploadEnabled = imageUploadEnabled;
    chatPage.darkModeEnabled = darkModeEnabled;

    await chatPage.save();

    res.status(200).json({
      message: 'Chat page settings updated successfully',
      logoUrl: chatPage.logoUrl,
      colors: chatPage.colors, // Return the updated colors object
    });
  } catch (err) {
    console.error('Error updating chat page:', err);
    throw err; // Let the global error handler catch it
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
      titleColor: chatPage.titleColor,
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
    throw err; // Let the global error handler catch it
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
      titleColor: chatPage.titleColor,
      colors: chatPage.colors,
      logoUrl: chatPage.logoUrl,
      suggestedQuestionsEnabled: chatPage.suggestedQuestionsEnabled,
      suggestedQuestions: chatPage.suggestedQuestions,
      imageUploadEnabled: chatPage.imageUploadEnabled,
      darkModeEnabled: chatPage.darkModeEnabled,
    });
  } catch (err) {
    console.error('Error fetching chat page by botId:', err);
    throw err; // Let the global error handler catch it
  }
};
