// server/controllers/whatsappController.js
const axios = require('axios');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const { processMessage } = require('../botEngine');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// التحقق من الـ Webhook
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log(`[${getTimestamp()}] ✅ WhatsApp Webhook verified successfully`);
      return res.status(200).send(challenge);
    } else {
      console.log(`[${getTimestamp()}] ⚠️ Webhook verification failed: Invalid token`);
      return res.sendStatus(403);
    }
  }
  console.log(`[${getTimestamp()}] ⚠️ Webhook verification failed: Missing parameters`);
  res.sendStatus(400);
};

// معالجة الرسائل القادمة من واتساب
const handleMessage = async (req, res) => {
  try {
    const body = req.body;
    console.log(`[${getTimestamp()}] 📩 WhatsApp Webhook POST request received:`, JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      console.log(`[${getTimestamp()}] ⚠️ Ignored non-WhatsApp webhook event:`, body.object);
      return res.sendStatus(400);
    }

    for (const entry of body.entry) {
      const wabaId = entry.id;
      const bot = await Bot.findOne({ whatsappBusinessAccountId: wabaId });
      if (!bot) {
        console.log(`[${getTimestamp()}] ❌ No bot found for WhatsApp Business Account ID: ${wabaId}`);
        continue;
      }

      if (!bot.isActive) {
        console.log(`[${getTimestamp()}] ⚠️ Bot ${bot.name} (ID: ${bot._id}) is inactive`);
        continue;
      }

      for (const change of entry.changes) {
        if (change.field !== 'messages') {
          console.log(`[${getTimestamp()}] ⚠️ Ignored non-message event: ${change.field}`);
          continue;
        }

        const messageEvent = change.value;
        if (messageEvent.messaging_product !== 'whatsapp') {
          console.log(`[${getTimestamp()}] ⚠️ Ignored non-WhatsApp messaging product`);
          continue;
        }

        const messages = messageEvent.messages || [];

        for (const message of messages) {
          const senderId = message.from;
          const phoneNumberId = messageEvent.metadata.phone_number_id;
          const prefixedSenderId = `whatsapp_${senderId}`;

          // تجاهل الرسائل المرسلة من الحساب نفسه
          if (senderId === messageEvent.metadata.display_phone_number) {
            console.log(`[${getTimestamp()}] ⚠️ Ignoring message sent by the account itself: ${senderId}`);
            continue;
          }

          // إنشاء أو تحديث المحادثة
          let conversation = await Conversation.findOne({
            botId: bot._id,
            platform: 'whatsapp',
            userId: prefixedSenderId
          });

          if (!conversation) {
            conversation = new Conversation({
              botId: bot._id,
              platform: 'whatsapp',
              userId: prefixedSenderId,
              messages: []
            });
            await conversation.save();
          }

          // إضافة ملصق "new_message" للمحادثة
          conversation.labels = conversation.labels || [];
          if (!conversation.labels.includes('new_message')) {
            conversation.labels.push('new_message');
            await conversation.save();
          }

          // معالجة رسائل الترحيب (opt-ins)
          if (message.type === 'text' && bot.whatsappMessagingOptinsEnabled && !conversation.messages.length) {
            console.log(`[${getTimestamp()}] 📩 Processing opt-in event for ${prefixedSenderId}`);
            const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
            await sendMessage(senderId, welcomeMessage, bot.whatsappApiKey, phoneNumberId);
            continue;
          }

          // معالجة ردود الفعل (reactions)
          if (message.type === 'reaction' && bot.whatsappMessageReactionsEnabled) {
            console.log(`[${getTimestamp()}] 📩 Processing reaction event from ${prefixedSenderId}: ${message.reaction.emoji}`);
            const responseText = `شكرًا على تفاعلك (${message.reaction.emoji})!`;
            await sendMessage(senderId, responseText, bot.whatsappApiKey, phoneNumberId);
            continue;
          }

          // معالجة تتبع المصدر (referrals)
          if (message.referral && bot.whatsappMessagingReferralsEnabled) {
            console.log(`[${getTimestamp()}] 📩 Processing referral event from ${prefixedSenderId}: ${message.referral.source}`);
            const responseText = `مرحبًا! وصلتني من ${message.referral.source}، كيف يمكنني مساعدتك؟`;
            await sendMessage(senderId, responseText, bot.whatsappApiKey, phoneNumberId);
            continue;
          }

          // معالجة الرسائل (نصوص، صور، صوت)
          if (message.type === 'text') {
            const messageId = message.id || `msg_${Date.now()}`;
            console.log(`[${getTimestamp()}] 📝 Text message received from ${prefixedSenderId}: ${message.text.body}`);
            const reply = await processMessage(bot._id, prefixedSenderId, message.text.body, false, false, messageId);
            await sendMessage(senderId, reply, bot.whatsappApiKey, phoneNumberId);
          } else if (message.type === 'image') {
            const messageId = message.id || `msg_${Date.now()}`;
            console.log(`[${getTimestamp()}] 🖼️ Image received from ${prefixedSenderId}: ${message.image.url}`);
            const reply = await processMessage(bot._id, prefixedSenderId, message.image.url, true, false, messageId);
            await sendMessage(senderId, reply, bot.whatsappApiKey, phoneNumberId);
          } else if (message.type === 'audio') {
            const messageId = message.id || `msg_${Date.now()}`;
            console.log(`[${getTimestamp()}] 🎙️ Audio received from ${prefixedSenderId}: ${message.audio.url}`);
            const reply = await processMessage(bot._id, prefixedSenderId, message.audio.url, false, true, messageId);
            await sendMessage(senderId, reply, bot.whatsappApiKey, phoneNumberId);
          } else {
            console.log(`[${getTimestamp()}] 📎 Unsupported message type from ${prefixedSenderId}: ${message.type}`);
            await sendMessage(senderId, 'عذرًا، لا أستطيع معالجة هذا النوع من الرسائل حاليًا.', bot.whatsappApiKey, phoneNumberId);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in handleMessage:`, err.message, err.stack);
    res.sendStatus(500);
  }
};

// إرسال رسالة عبر WhatsApp API
const sendMessage = async (recipientId, messageText, accessToken, phoneNumberId) => {
  try {
    const response = await axios.post(
      `https://graph.whatsapp.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipientId,
        type: 'text',
        text: { body: messageText }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[${getTimestamp()}] ✅ Message sent to ${recipientId}: ${messageText}`);
    return response.data;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error sending message to WhatsApp:`, err.response?.data || err.message);
    throw err;
  }
};

module.exports = { verifyWebhook, handleMessage, sendMessage };
