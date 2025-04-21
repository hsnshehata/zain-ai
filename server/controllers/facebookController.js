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
      const pageId = entry.id;

      // Find the bot associated with the page
      const bot = await Bot.findOne({ facebookPageId: pageId });
      if (!bot) {
        console.log(`❌ No bot found for page ID: ${pageId}`);
        continue;
      }

      // Handle Messaging Events (Existing logic for messages)
      if (entry.messaging && entry.messaging.length > 0) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender?.id;

        if (!senderPsid) {
          console.log('❌ Sender PSID not found in webhook event:', webhookEvent);
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

          conversation.messages.push({
            role: 'user',
            content: message.text || 'رسالة غير نصية',
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

          conversation.messages.push({
            role: 'assistant',
            content: responseText,
          });

          await conversation.save();

          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else {
          console.log('❌ No message found in webhook event:', webhookEvent);
        }
      }

      // Handle Feed Events (New logic for comments)
      if (entry.changes && entry.changes.length > 0) {
        for (const change of entry.changes) {
          if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
            const commentEvent = change.value;
            const commentId = commentEvent.comment_id;
            const postId = commentEvent.post_id;
            const message = commentEvent.message;
            const commenterId = commentEvent.from?.id;
            const commenterName = commentEvent.from?.name;

            if (!commenterId || !message) {
              console.log('❌ Commenter ID or message not found in feed event:', commentEvent);
              continue;
            }

            console.log(`💬 Comment received on post ${postId} from ${commenterName} (${commenterId}): ${message}`);

            // Find or create a conversation for the commenter
            let conversation = await Conversation.findOne({
              botId: bot._id,
              userId: commenterId,
            });

            if (!conversation) {
              conversation = new Conversation({
                botId: bot._id,
                userId: commenterId,
                messages: [],
              });
            }

            // Add the comment to the conversation
            conversation.messages.push({
              role: 'user',
              content: message,
            });

            // Process the comment using the same bot engine
            const responseText = await processMessage(bot._id, commenterId, message);

            // Add the bot's response to the conversation
            conversation.messages.push({
              role: 'assistant',
              content: responseText,
            });

            await conversation.save();

            // Reply to the comment using Graph API
            await replyToComment(commentId, responseText, bot.facebookApiKey);
          } else {
            console.log('❌ Not a comment event or not an "add" verb:', change);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('❌ Error in handleMessage:', err.message, err.stack);
    res.sendStatus(500);
  }
};

// Function to send a message via Messenger (Existing function)
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

// Function to reply to a comment using Graph API
const replyToComment = (commentId, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    const requestBody = {
      message: responseText,
    };

    request(
      {
        uri: `https://graph.facebook.com/v22.0/${commentId}/comments`,
        qs: { access_token: facebookApiKey },
        method: 'POST',
        json: requestBody,
      },
      (err, res, body) => {
        if (err) {
          console.error('❌ Error replying to comment on Facebook:', err.message, err.stack);
          return reject(err);
        }
        if (res.statusCode !== 200) {
          console.error('❌ Failed to reply to comment on Facebook:', body);
          return reject(new Error('Failed to reply to comment on Facebook'));
        }
        console.log(`✅ Replied to comment ${commentId}: ${responseText}`);
        resolve(body);
      }
    );
  });
};

module.exports = { handleMessage, sendMessage };
