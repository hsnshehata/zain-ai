const request = require('request');
const Bot = require('../models/Bot');
const { processMessage } = require('../botEngine');
const Conversation = require('../models/Conversation');

const handleMessage = async (req, res) => {
  try {
    console.log('📩 Webhook POST request received:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (body.object !== 'page') {
      console.log('❌ Invalid webhook event: Not a page object');
      return res.sendStatus(404);
    }

    for (const entry of body.entry) {
      if (!entry.messaging || entry.messaging.length === 0) {
        console.log('❌ No messaging events found in entry:', entry);
        continue;
      }

      const webhookEvent = entry.messaging[0];
      const senderPsid = webhookEvent.sender?.id;
      const messageId = webhookEvent.message?.mid; // Unique message ID from Facebook

      if (!senderPsid) {
        console.log('❌ Sender PSID not found in webhook event:', webhookEvent);
        continue;
      }

      const pageId = entry.id;
      const bot = await Bot.findOne({ facebookPageId: pageId });

      if (!bot) {
        console.log(`❌ No bot found for page ID: ${pageId}`);
        continue;
      }

      let conversation = await Conversation.findOne({
        botId: bot._id,
        userId: senderPsid,
      });

      if (!conversation) {
        conversation = new Conversation({
          botId: bot._id,
          userId: senderPsid,
          messages: [],
        });
      }

      if (webhookEvent.message) {
        const message = webhookEvent.message;

        // Check if message already exists to prevent duplicates
        if (messageId && conversation.messages.some(msg => msg.messageId === messageId)) {
          console.log(`⚠️ Duplicate message detected with messageId: ${messageId}`);
          continue;
        }

        conversation.messages.push({
          role: 'user',
          content: message.text || 'رسالة غير نصية',
          messageId: messageId || undefined,
        });

        let responseText = '';

        if (message.text) {
          console.log(`📝 Text message received from ${senderPsid}: ${message.text}`);
          responseText = await processMessage(bot._id, senderPsid, message.text);
        } else if (message.attachments) {
          const attachment = message.attachments[0];
          if (attachment.type === 'image') {
            console.log(`🖼️ Image received from ${senderPsid}: ${attachment.payload.url}`);
            responseText = await processMessage(bot._id, senderPsid, attachment.payload.url, true);
          } else if (attachment.type === 'audio') {
            console.log(`🎙️ Audio received from ${senderPsid}: ${attachment.payload.url}`);
            responseText = await processMessage(bot._id, senderPsid, attachment.payload.url, false, true);
          } else {
            console.log(`📎 Unsupported attachment type from ${senderPsid}: ${attachment.type}`);
            responseText = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
          }
        } else {
          console.log(`❓ Unknown message type from ${senderPsid}`);
          responseText = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
        }

        // Generate a unique messageId for assistant response if needed
        const assistantMessageId = messageId ? `${messageId}-assistant` : undefined;

        conversation.messages.push({
          role: 'assistant',
          content: responseText,
          messageId: assistantMessageId,
        });

        await conversation.save();

        await sendMessage(senderPsid, responseText, bot.facebookApiKey);
      } else {
        console.log('❌ No message found in webhook event:', webhookEvent);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('❌ Error in handleMessage:', err.message, err.stack);
    res.sendStatus(500);
  }
};

const sendMessage = (senderPsid, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    const requestBody = {
      recipient: { id: senderPsid },
      message: { text: responseText },
    };

    request(
      {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: facebookApiKey },
        method: 'POST',
        json: requestBody,
      },
      (err, res, body) => {
        if (err) {
          console.error('❌ Error sending message to Facebook:', err.message, err.stack);
          return reject(err);
        }
        if (res.statusCode !== 200) {
          console.error('❌ Failed to send message to Facebook:', body);
          return reject(new Error('Failed to send message to Facebook'));
        }
        console.log(`✅ Message sent to ${senderPsid}: ${responseText}`);
        resolve(body);
      }
    );
  });
};

module.exports = { handleMessage, sendMessage };
