const request = require('request');
const NodeCache = require('node-cache');
const Bot = require('../models/Bot');
const { processMessage } = require('../botEngine');
const Conversation = require('../models/Conversation');
const Feedback = require('../models/Feedback');

// إعداد cache لتخزين الـ webhook events مؤقتاً (5 دقايق)
const webhookCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const handleMessage = async (req, res) => {
  try {
    console.log('📩 Webhook POST request received:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (body.object !== 'page') {
      console.log('❌ Invalid webhook event: Not a page object');
      return res.sendStatus(404);
    }

    // فحص تكرار الـ webhook event
    const eventHash = JSON.stringify(body);
    if (webhookCache.get(eventHash)) {
      console.log('⚠️ Duplicate webhook event detected, skipping...');
      return res.status(200).send('EVENT_RECEIVED');
    }
    webhookCache.set(eventHash, true);

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ facebookPageId: pageId });
      if (!bot) {
        console.log(`❌ No bot found for page ID: ${pageId}`);
        continue;
      }

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
          await conversation.save();
          console.log(`📋 Created new conversation for bot ${bot._id} and user ${senderPsid}`);

          if (bot.messagingOptinsEnabled) {
            const welcomeMessage = 'مرحبًا! أنا هنا لمساعدتك. كيف يمكنني مساعدتك اليوم؟';
            await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
            conversation.messages.push({
              role: 'assistant',
              content: welcomeMessage,
              messageId: `welcome_${Date.now()}`,
            });
            await conversation.save();
          }
        }

        // التعامل مع الـ messaging_optins
        if (webhookEvent.optin && bot.messagingOptinsEnabled) {
          console.log(`📩 Opt-in event received from ${senderPsid}`);
          const welcomeMessage = 'مرحبًا بك! شكرًا لاشتراكك. كيف يمكنني مساعدتك؟';
          await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
          conversation.messages.push({
            role: 'assistant',
            content: welcomeMessage,
            messageId: `optin_${Date.now()}`,
          });
          await conversation.save();
        }

        // التعامل مع الـ message_reactions
        if (webhookEvent.reaction && bot.messageReactionsEnabled) {
          const reactionType = webhookEvent.reaction.reaction || 'other';
          const emoji = webhookEvent.reaction.emoji || '';
          console.log(`😊 Reaction received from ${senderPsid}: ${reactionType}`);

          const reactionMessage = `شكرًا على تفاعلك بـ ${reactionType}${emoji ? ` (${emoji})` : ''}!`;
          await sendMessage(senderPsid, reactionMessage, bot.facebookApiKey);
        }

        // التعامل مع الـ messaging_referrals
        if (webhookEvent.referral && bot.messagingReferralsEnabled) {
          const referralSource = webhookEvent.referral.source;
          const referralRef = webhookEvent.referral.ref || 'unknown';
          console.log(`📈 Referral received from ${senderPsid}: Source=${referralSource}, Ref=${referralRef}`);

          const referralMessage = `وصلت إلى البوت من مصدر: ${referralSource} (Ref: ${referralRef})`;
          const responseText = await processMessage(bot._id, senderPsid, referralMessage);

          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          conversation.messages.push({
            role: 'assistant',
            content: responseText,
            messageId: `referral_${Date.now()}`,
          });
          await conversation.save();
        }

        // التعامل مع الـ message_edits
        if (webhookEvent.message_edit && bot.messageEditsEnabled) {
          const editedMessage = webhookEvent.message_edit.text;
          const messageId = webhookEvent.message_edit.mid;
          console.log(`✍️ Edited message received from ${senderPsid}: ${editedMessage}`);

          const existingMessage = conversation.messages.find(msg => msg.messageId === messageId && msg.role === 'user');
          if (existingMessage) {
            existingMessage.content = editedMessage;
            existingMessage.timestamp = new Date();
            console.log(`✅ Updated existing message with ID ${messageId}`);
          } else {
            conversation.messages.push({
              role: 'user',
              content: editedMessage,
              messageId: messageId,
            });
            console.log(`✅ Added new edited message with ID ${messageId}`);
          }

          const responseText = await processMessage(bot._id, senderPsid, editedMessage);
          conversation.messages.push({
            role: 'assistant',
            content: responseText,
            messageId: `response_${messageId}`,
          });
          await conversation.save();
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        }

        // التعامل مع الـ inbox_labels
        if (bot.inboxLabelsEnabled) {
          console.log(`🏷️ Adding label to conversation for user ${senderPsid}`);
        }

        // التعامل مع الـ response_feedback
        if (webhookEvent.response_feedback) {
          const feedbackData = webhookEvent.response_feedback;
          const mid = feedbackData.mid;
          const feedback = feedbackData.feedback;

          console.log(`📊 Feedback received from ${senderPsid}: ${feedback} for message ID: ${mid}`);

          const feedbackEntry = new Feedback({
            botId: bot._id,
            userId: senderPsid,
            messageId: mid,
            feedback: feedback === 'Good response' ? 'positive' : 'negative',
            messageContent: conversation.messages.find(msg => msg.messageId === mid)?.content || 'غير معروف',
            timestamp: new Date(webhookEvent.timestamp * 1000),
          });

          await feedbackEntry.save();
          console.log(`✅ Feedback saved: ${feedback} for message ID: ${mid}`);
        }

        // التعامل مع الرسائل العادية
        if (webhookEvent.message && !webhookEvent.message_edit) {
          const message = webhookEvent.message;
          const mid = message.mid || `temp_${Date.now()}`;
          const messageContent = message.text || (message.attachments ? JSON.stringify(message.attachments) : 'رسالة غير نصية');

          // فحص تكرار الرسالة
          const messageKey = `${mid}-${messageContent}-${webhookEvent.timestamp}`;
          if (conversation.messages.some(msg => {
            const msgKey = `${msg.messageId}-${msg.content}-${msg.timestamp}`;
            return msgKey === messageKey;
          })) {
            console.log(`⚠️ Duplicate message detected with key ${messageKey}, skipping...`);
            continue;
          }

          console.log(`📝 Storing message with mid: ${mid}`);

          conversation.messages.push({
            role: 'user',
            content: messageContent,
            messageId: mid,
            timestamp: new Date(webhookEvent.timestamp * 1000),
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
            messageId: `response_${mid}`,
            timestamp: new Date(),
          });

          await conversation.save();
          console.log(`📋 Conversation updated with new message and response`);

          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else if (!webhookEvent.response_feedback) {
          console.log('❌ No message or feedback found in webhook event:', webhookEvent);
        }
      }

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

              if (bot.messagingOptinsEnabled) {
                const welcomeMessage = 'مرحبًا! أنا هنا لمساعدتك. كيف يمكنني مساعدتك اليوم؟';
                await sendMessage(commenterId, welcomeMessage, bot.facebookApiKey);
                conversation.messages.push({
                  role: 'assistant',
                  content: welcomeMessage,
                  messageId: `welcome_${Date.now()}`,
                });
              }
            }

            const commentKey = `comment-${commentId}-${message}`;
            if (conversation.messages.some(msg => msg.messageId === commentKey)) {
              console.log(`⚠️ Duplicate comment detected with key ${commentKey}, skipping...`);
              continue;
            }

            conversation.messages.push({
              role: 'user',
              content: message,
              messageId: commentKey,
            });

            const responseText = await processMessage(bot._id, commenterId, message);

            conversation.messages.push({
              role: 'assistant',
              content: responseText,
              messageId: `response_${commentKey}`,
            });

            await conversation.save();

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
          if (body.error && body.error.code === 190 && body.error.error_subcode === 463) {
            console.error('⚠️ Facebook Access Token has expired. Please update the token for this bot.');
            return reject(new Error('Facebook Access Token has expired. Please update the token.'));
          }
          return reject(new Error('Failed to send message to Facebook'));
        }
        console.log(`✅ Message sent to ${senderPsid}: ${responseText}`);
        resolve(body);
      }
    );
  });
};

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
          if (body.error && body.error.code === 190 && body.error.error_subcode === 463) {
            console.error('⚠️ Facebook Access Token has expired. Please update the token for this bot.');
            return reject(new Error('Facebook Access Token has expired. Please update the token.'));
          }
          return reject(new Error('Failed to reply to comment on Facebook'));
        }
        console.log(`✅ Replied to comment ${commentId}: ${responseText}`);
        resolve(body);
      }
    );
  });
};

module.exports = { handleMessage, sendMessage };
