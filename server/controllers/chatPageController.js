// server/controllers/chatPageController.js

const { v4: uuidv4 } = require('uuid');
const ChatPage = require('../models/ChatPage');
const Feedback = require('../models/Feedback');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../logger');

// Load environment variables
require('dotenv').config();
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Function to upload image to imgbb using axios
async function uploadToImgbb(file) {
  try {
    const maxSizeInBytes = 32 * 1024 * 1024; // 32MB in bytes
    if (file.size > maxSizeInBytes) {
      throw new Error('حجم الصورة أكبر من الحد الأقصى المسموح (32 ميجابايت)');
    }

    const allowedTypes = ['image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('نوع الصورة غير مدعوم، يرجى رفع صورة بصيغة PNG');
    }

    const formData = new FormData();
    formData.append('image', file.buffer, file.originalname);
    formData.append('key', IMGBB_API_KEY);

    logger.info('imgbb_upload_start');
    const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    logger.info('imgbb_upload_response', { success: response.data?.success, status: response.status });

    if (response.status !== 200 || !response.data.success) {
      throw new Error(`فشل في رفع الصورة إلى imgbb: ${response.data.error?.message || 'خطأ غير معروف'}`);
    }

    return {
      imageUrl: response.data.data.url, // رابط الصورة الأصلي
      thumbUrl: response.data.data.thumb.url, // رابط الصورة المصغرة
      deleteUrl: response.data.data.delete_url,
    };
  } catch (err) {
    logger.error('imgbb_upload_error', { err: err.message, stack: err.stack });
    throw err;
  }
}

// Function to delete image from imgbb using axios
async function deleteFromImgbb(deleteUrl) {
  if (!deleteUrl) return;

  try {
    const response = await axios.delete(deleteUrl);
    if (response.status !== 200) {
      logger.warn('imgbb_delete_failed', { status: response.status, statusText: response.statusText });
    } else {
      logger.info('imgbb_delete_success');
    }
  } catch (err) {
    logger.error('imgbb_delete_error', { err: err.message, stack: err.stack });
  }
}

// Create a new chat page
exports.createChatPage = async (req, res) => {
  try {
    const { userId, botId, linkId } = req.body;
    if (!userId || !botId) {
      return res.status(400).json({ message: 'User ID and Bot ID are required' });
    }

    // إذا المستخدم مدخلش linkId، هنولد UUID تلقائيًا ونظبطه عشان يكون مناسب
    let finalLinkId = linkId;
    if (!finalLinkId) {
      // نولد UUID ونزيل الفواصل منه
      const rawUuid = uuidv4().replace(/-/g, '');
      // ناخد أول 12 حرف بس عشان ميبقاش طويل أوي وفي نفس الوقت يفي بالشرط بتاع 4 أحرف على الأقل
      finalLinkId = rawUuid.substring(0, 12);
    }

    const existingPage = await ChatPage.findOne({ botId });
    if (existingPage) {
      const chatLink = `${process.env.APP_URL || 'https://zainbot.com'}/chat/${existingPage.linkId}`;
      return res.status(200).json({ link: chatLink, chatPageId: existingPage._id, exists: true });
    }

    // التحقق إذا كان الـ linkId موجود بالفعل
    const linkExists = await ChatPage.findOne({ linkId: finalLinkId });
    if (linkExists) {
      return res.status(400).json({ message: 'الرابط مستخدم بالفعل، يرجى اختيار رابط آخر' });
    }

    const chatPage = new ChatPage({
      userId,
      botId,
      linkId: finalLinkId,
    });

    await chatPage.save();

    const chatLink = `${process.env.APP_URL || 'https://zainbot.com'}/chat/${finalLinkId}`;

    res.status(201).json({ link: chatLink, chatPageId: chatPage._id, exists: false });
  } catch (err) {
    logger.error('chat_page_create_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في إنشاء صفحة الدردشة' });
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

    const title = req.body.title || chatPage.title;
    const titleColor = req.body.titleColor || chatPage.titleColor;
    let colors = chatPage.colors;
    if (req.body.colors) {
      try {
        colors = JSON.parse(req.body.colors);
      } catch (e) {
        logger.warn('chat_page_parse_colors_error', { err: e.message });
        return res.status(400).json({ message: 'Invalid colors format' });
      }
    }
    const suggestedQuestionsEnabled = req.body.suggestedQuestionsEnabled === 'true' ? true : req.body.suggestedQuestionsEnabled === 'false' ? false : chatPage.suggestedQuestionsEnabled;
    let suggestedQuestions = chatPage.suggestedQuestions;
    if (req.body.suggestedQuestions) {
      try {
        suggestedQuestions = JSON.parse(req.body.suggestedQuestions);
      } catch (e) {
        logger.warn('chat_page_parse_suggested_questions_error', { err: e.message });
        return res.status(400).json({ message: 'Invalid suggestedQuestions format' });
      }
    }
    const imageUploadEnabled = req.body.imageUploadEnabled === 'true' ? true : req.body.imageUploadEnabled === 'false' ? false : chatPage.imageUploadEnabled;
    const headerHidden = req.body.headerHidden === 'true' ? true : req.body.headerHidden === 'false' ? false : chatPage.headerHidden;
    let linkId = chatPage.linkId;

    // التحقق إذا كان المستخدم بيحاول يعدل الرابط
    if (req.body.linkId && req.body.linkId !== chatPage.linkId) {
      const newLinkId = req.body.linkId;
      // التحقق إذا كان الرابط الجديد مستخدم بالفعل
      const linkExists = await ChatPage.findOne({ linkId: newLinkId });
      if (linkExists) {
        return res.status(400).json({ message: 'الرابط مستخدم بالفعل، يرجى اختيار رابط آخر' });
      }
      linkId = newLinkId;
    }

    let logoUrl = chatPage.logoUrl;
    let logoDeleteUrl = chatPage.logoDeleteUrl;

    if (req.file) {
      try {
        if (logoDeleteUrl) {
          await deleteFromImgbb(logoDeleteUrl);
        }

        const uploadResult = await uploadToImgbb(req.file);
        logoUrl = uploadResult.imageUrl;
        logoDeleteUrl = uploadResult.deleteUrl;
      } catch (err) {
        return res.status(500).json({ message: `فشل في رفع الشعار: ${err.message}` });
      }
    }

    chatPage.title = title;
    chatPage.titleColor = titleColor;
    chatPage.colors = colors;
    chatPage.logoUrl = logoUrl;
    chatPage.logoDeleteUrl = logoDeleteUrl;
    chatPage.suggestedQuestionsEnabled = suggestedQuestionsEnabled;
    chatPage.suggestedQuestions = suggestedQuestions;
    chatPage.imageUploadEnabled = imageUploadEnabled;
    chatPage.headerHidden = headerHidden;
    chatPage.linkId = linkId;

    await chatPage.save();

    const updatedChatLink = `${process.env.APP_URL || 'https://zainbot.com'}/chat/${linkId}`;

    res.status(200).json({
      message: 'Chat page settings updated successfully',
      logoUrl: chatPage.logoUrl,
      colors: chatPage.colors,
      headerHidden: chatPage.headerHidden,
      link: updatedChatLink,
    });
  } catch (err) {
    logger.error('chat_page_update_error', { chatPageId: req.params.id, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في تحديث إعدادات صفحة الدردشة' });
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
      headerHidden: chatPage.headerHidden,
      botId: chatPage.botId._id,
    });
  } catch (err) {
    logger.error('chat_page_fetch_error', { linkId: req.params.linkId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب إعدادات صفحة الدردشة' });
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
    const chatLink = `${process.env.APP_URL || 'https://zainbot.com'}/chat/${chatPage.linkId}`;
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
      headerHidden: chatPage.headerHidden,
    });
  } catch (err) {
    logger.error('chat_page_fetch_by_bot_error', { botId: req.params.botId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب إعدادات صفحة الدردشة' });
  }
};

// Submit feedback from chat page
exports.submitFeedback = async (req, res) => {
  try {
    const { botId, userId, messageId, feedback, messageContent } = req.body;
    if (!botId || !userId || !messageId || !feedback || !messageContent) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    const feedbackEntry = new Feedback({
      botId,
      userId,
      messageId,
      feedback,
      messageContent,
      timestamp: new Date(),
    });

    await feedbackEntry.save();
    res.status(201).json({ message: 'تم تسجيل التقييم بنجاح' });
  } catch (err) {
    logger.error('chat_feedback_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
