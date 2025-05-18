// server/controllers/chatPageController.js

const { v4: uuidv4 } = require('uuid');
const ChatPage = require('../models/ChatPage');
const Feedback = require('../models/Feedback');
const axios = require('axios');
const FormData = require('form-data');

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
      const chatLink = `${process.env.APP_URL || 'https://zain-ai-a06a.onrender.com'}/chat/${existingPage.linkId}`;
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

    const chatLink = `${process.env.APP_URL || 'https://zain-ai-a06a.onrender.com'}/chat/${finalLinkId}`;

    res.status(201).json({ link: chatLink, chatPageId: chatPage._id, exists: false });
  } catch (err) {
    console.error('Error creating chat page:', err);
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
        logoUrl = uploadResult.url;
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

    const updatedChatLink = `${process.env.APP_URL || 'https://zain-ai-a06a.onrender.com'}/chat/${linkId}`;

    res.status(200).json({
      message: 'Chat page settings updated successfully',
      logoUrl: chatPage.logoUrl,
      colors: chatPage.colors,
      headerHidden: chatPage.headerHidden,
      link: updatedChatLink,
    });
  } catch (err) {
    console.error('Error updating chat page:', err);
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
    console.error('Error fetching chat page:', err);
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
      headerHidden: chatPage.headerHidden,
    });
  } catch (err) {
    console.error('Error fetching chat page by botId:', err);
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
    console.error('❌ خطأ في تسجيل التقييم:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
