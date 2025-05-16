const request = require('request');
const Conversation = require('../models/Conversation');
const Bot = require('../models/Bot');
const axios = require('axios');
const mongoose = require('mongoose');
const { processMessage } = require('./messageProcessor');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// التحقق من صلاحية التوكن
const validateAccessToken = async (accessToken) => {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/v20.0/me?fields=id&access_token=${accessToken}`
    );
    if (response.data.id) {
      console.log(`[${getTimestamp()}] ✅ Access token is valid`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Access token validation failed:`, err.response?.data || err.message);
    return false;
  }
};

// إرسال رسالة عبر Instagram API
const sendMessage = (recipientId, messageText, accessToken) => {
  return new Promise((resolve, reject) => {
    request({
      url: `https://graph.instagram.com/v20.0/me/messages?access_token=${accessToken}`,
      method: 'POST',
      json: {
        recipient: { id: recipientId },
        message: { text: messageText }
      }
    }, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error(`[${getTimestamp()}] ❌ Failed to send message to Instagram:`, body?.error || error);
        return reject(new Error('Failed to send message to Instagram'));
      }
      console.log(`[${getTimestamp()}] ✅ Message sent to ${recipientId}: ${messageText}`);
      resolve(body);
    });
  });
};

// التحقق من الـ Webhook
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      console.log(`[${getTimestamp()}] ✅ Webhook verified successfully`);
      return res.status(200).send(challenge);
    } else {
      console.log(`[${getTimestamp()}] ⚠️ Webhook verification failed: Invalid token`);
      return res.sendStatus(403);
    }
  }
  console.log(`[${getTimestamp()}] ⚠️ Webhook verification failed: Missing parameters`);
  res.sendStatus(400);
};

// معالجة الرسائل القادمة من Instagram
exports.handleMessage = async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'instagram') {
      console.log(`[${getTimestamp()}] ⚠️ Ignored non-Instagram webhook event:`, body.object);
      return res.sendStatus(400);
    }

    console.log(`[${getTimestamp()}] 📩 Instagram Webhook POST request received:`, JSON.stringify(body, null, 2));

    for (const entry of body.entry) {
      const pageId = entry.id;

      // البحث عن البوت بناءً على Instagram Page ID
      const bot = await Bot.findOne({ instagramPageId: pageId });
      if (!bot) {
        console.log(`[${getTimestamp()}] ❌ No bot found for Instagram page ID: ${pageId}`);
        continue;
      }

      // التحقق من صلاحية التوكن
      const isTokenValid = await validateAccessToken(bot.instagramApiKey);
      if (!isTokenValid) {
        console.error(`[${getTimestamp()}] ❌ Access token for bot ${bot._id} is invalid. Please refresh the token.`);
        continue;
      }

      if (!entry.messaging) {
        console.log(`[${getTimestamp()}] ⚠️ No messaging events in entry for page ID: ${pageId}`);
        continue;
      }

      for (const event of entry.messaging) {
        const senderId = event.sender.id;
        const recipientId = event.recipient.id;
        const timestamp = event.timestamp;

        // تجاهل الرسائل المرسلة من الصفحة نفسها
        if (senderId === recipientId) {
          console.log(`[${getTimestamp()}] ⚠️ Ignoring message sent by the page itself: ${senderId}`);
          continue;
        }

        // إنشاء أو تحديث المحادثة
        let conversation = await Conversation.findOne({
          botId: bot._id,
          platform: 'instagram',
          userId: senderId
        });

        if (!conversation) {
          conversation = new Conversation({
            botId: bot._id,
            platform: 'instagram',
            userId: senderId,
            messages: []
          });
        }

        // إضافة ملصق "new_message" للمحادثة
        console.log(`[${getTimestamp()}] 🏷️ Adding label to conversation for user ${senderId}`);
        conversation.labels = conversation.labels || [];
        if (!conversation.labels.includes('new_message')) {
          conversation.labels.push('new_message');
        }

        // معالجة الرسالة
        if (event.message) {
          const messageText = event.message.text;
          if (!messageText) {
            console.log(`[${getTimestamp()}] ⚠️ No text in message from ${senderId}`);
            continue;
          }

          console.log(`[${getTimestamp()}] 📝 Text message received from ${senderId}: ${messageText}`);

          // إضافة رسالة المستخدم إلى المحادثة
          conversation.messages.push({
            sender: 'user',
            content: messageText,
            timestamp: new Date(timestamp)
          });

          // معالجة الرسالة
          console.log(`[${getTimestamp()}] 🤖 Processing message for bot: ${bot._id} user: ${senderId} message: ${messageText}`);
          const reply = await processMessage(bot, senderId, messageText, 'instagram');

          // إضافة رد البوت إلى المحادثة
          conversation.messages.push({
            sender: 'bot',
            content: reply,
            timestamp: new Date()
          });

          console.log(`[${getTimestamp()}] 📋 Found existing conversation: ${conversation._id}`);
          await conversation.save();

          // إرسال الرد للمستخدم
          console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${senderId} with token: ${bot.instagramApiKey.slice(0, 10)}...`);
          await sendMessage(senderId, reply, bot.instagramApiKey);
          console.log(`[${getTimestamp()}] 💬 Assistant reply added to conversation: ${reply}`);
        } else {
          console.log(`[${getTimestamp()}] ⚠️ Unhandled event type from ${senderId}`);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in handleMessage:`, err.message, err.stack);
    res.sendStatus(500);
  }
};
