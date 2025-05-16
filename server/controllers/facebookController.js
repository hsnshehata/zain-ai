const axios = require('axios');
const Bot = require('../models/Bot');
const botEngine = require('./botEngine'); // تعديل المسار من '../utils/botEngine' إلى './botEngine'
const botsController = require('./botsController');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

exports.webhook = async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging ? entry.messaging[0] : entry.changes[0];

      if (webhookEvent) {
        // معالجة الرسائل
        if (webhookEvent.message) {
          await handleMessage(webhookEvent);
        }
        // معالجة التعليقات
        else if (webhookEvent.field === 'feed' && webhookEvent.value && webhookEvent.value.item === 'comment') {
          await handleComment(webhookEvent);
        }
        // معالجة الـ feedback
        else if (webhookEvent.field === 'response_feedback') {
          await handleFeedback(webhookEvent);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
};

exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
      console.log(`[${getTimestamp()}] ✅ Webhook verified successfully`);
      res.status(200).send(challenge);
    } else {
      console.log(`[${getTimestamp()}] ❌ Webhook verification failed`);
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(403);
  }
};

async function handleMessage(event) {
  const senderId = event.sender.id;
  const recipientId = event.recipient.id;
  const messageText = event.message.text;
  const messageId = event.message.mid;

  if (!messageText) {
    console.log(`[${getTimestamp()}] ⚠️ Ignoring empty message from user: ${senderId}`);
    return;
  }

  if (event.message.is_echo) {
    console.log(`[${getTimestamp()}] ⚠️ Ignoring echo message from bot: ${senderId}`);
    return;
  }

  try {
    const bot = await Bot.findOne({ facebookPageId: recipientId });
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ Bot not found for page ID: ${recipientId}`);
      return;
    }

    if (!bot.isActive) {
      console.log(`[${getTimestamp()}] ⚠️ Bot is not active | Bot ID: ${bot._id}`);
      return;
    }

    // استخدام botEngine لمعالجة الرسالة
    const reply = await botEngine.processMessage(bot._id, senderId, messageText, false, false, messageId);

    // إرسال الرد للمستخدم
    await axios.post(
      `https://graph.facebook.com/v20.0/me/messages`,
      {
        recipient: { id: senderId },
        message: { text: reply },
      },
      {
        params: { access_token: bot.facebookApiKey },
      }
    );

    console.log(`[${getTimestamp()}] ✅ Replied to user ${senderId}: ${reply}`);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error handling message:`, err.message, err.stack);
  }
}

async function handleComment(event) {
  const commentId = event.value.comment_id;
  const commentText = event.value.message;
  const pageId = event.value.from.id;

  if (!commentText) {
    console.log(`[${getTimestamp()}] ⚠️ Ignoring empty comment: ${commentId}`);
    return;
  }

  try {
    const bot = await Bot.findOne({ facebookPageId: pageId });
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ Bot not found for page ID: ${pageId}`);
      return;
    }

    if (!bot.isActive || !bot.commentsRepliesEnabled) {
      console.log(`[${getTimestamp()}] ⚠️ Bot is not active or comments replies disabled | Bot ID: ${bot._id}`);
      return;
    }

    // استخدام botEngine لمعالجة التعليق
    const reply = await botEngine.processMessage(bot._id, commentId, commentText, false, false, commentId);

    // إرسال الرد على التعليق
    await axios.post(
      `https://graph.facebook.com/v20.0/${commentId}/comments`,
      {
        message: reply,
      },
      {
        params: { access_token: bot.facebookApiKey },
      }
    );

    console.log(`[${getTimestamp()}] ✅ Replied to comment ${commentId}: ${reply}`);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error handling comment:`, err.message, err.stack);
  }
}

async function handleFeedback(event) {
  const feedbackValue = event.value.feedback_value; // 'positive' or 'negative'
  const messageId = event.value.message_id;
  const userId = event.value.from.id;
  const pageId = event.value.recipient_id;

  try {
    const bot = await Bot.findOne({ facebookPageId: pageId });
    if (!bot) {
      console.log(`[${getTimestamp()}] ⚠️ Bot not found for page ID: ${pageId}`);
      return;
    }

    // استخدام botEngine لتسجيل الـ feedback
    await botEngine.processFeedback(bot._id, userId, messageId, feedbackValue);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error handling feedback:`, err.message, err.stack);
  }
}
