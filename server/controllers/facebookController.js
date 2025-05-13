const request = require('request');
const NodeCache = require('node-cache');
const Bot = require('../models/Bot');
const { processMessage, processFeedback } = require('../botEngine');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

// إعداد cache لتخزين الـ webhook events مؤقتاً (10 دقايق)
const webhookCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
// Cache لتخزين الـ messageId بتاع الرسايل الأصلية
const messageIdCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

const handleMessage = async (req, res) => {
  try {
    console.log('📩 Webhook POST request received:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (body.object !== 'page') {
      console.log('❌ Invalid webhook event: Not a page object');
      return res.sendStatus(404);
    }

    // فحص تكرار الـ webhook event
    let eventHash = '';
    const entry = body.entry[0];
    if (entry.messaging && entry.messaging[0]?.message) {
      eventHash = entry.messaging[0].message.mid;
    } else if (entry.changes && entry.changes[0]?.value.comment_id) {
      eventHash = entry.changes[0].value.comment_id;
    } else {
      eventHash = JSON.stringify(body);
    }

    if (webhookCache.get(eventHash)) {
      console.log(`⚠️ Duplicate webhook event detected for ${eventHash}, skipping...`);
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

      // التحقق من حالة البوت
      if (!bot.isActive) {
        console.log(`⚠️ Bot ${bot.name} (ID: ${bot._id}) is inactive, skipping message processing.`);
        continue;
      }

      if (entry.messaging && entry.messaging.length > 0) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender?.id;
        const recipientId = webhookEvent.recipient?.id;

        if (!senderPsid) {
          console.log('❌ Sender PSID not found in webhook event:', webhookEvent);
          continue;
        }

        // Validate that senderId is not the page itself
        if (senderPsid === bot.facebookPageId) {
          console.log(`⚠️ Skipping message because senderId (${senderPsid}) is the page itself`);
          continue;
        }

        // Validate that recipientId matches the page
        if (recipientId !== bot.facebookPageId) {
          console.log(`⚠️ Skipping message because recipientId (${recipientId}) does not match pageId (${bot.facebookPageId})`);
          continue;
        }

        // Check if the message is an echo (sent by the bot itself)
        if (webhookEvent.message && webhookEvent.message.is_echo) {
          console.log(`⚠️ Ignoring echo message from bot: ${webhookEvent.message.text}`);
          continue;
        }

        // التعامل مع الـ messaging_optins
        if (webhookEvent.optin && bot.messagingOptinsEnabled) {
          console.log(`📩 Opt-in event received from ${senderPsid}`);
          const welcomeMessage = bot.welcomeMessage || 'مرحبًا بك! شكرًا لاشتراكك. كيف يمكنني مساعدتك؟';
          await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
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
        }

        // التعامل مع الـ message_edits
        if (webhookEvent.message_edit && bot.messageEditsEnabled) {
          const editedMessage = webhookEvent.message_edit.text;
          const messageId = webhookEvent.message_edit.mid;
          console.log(`✍️ Edited message received from ${senderPsid}: ${editedMessage}`);

          const responseText = await processMessage(bot._id, senderPsid, editedMessage, false, false, messageId);
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        }

        // التعامل مع الـ inbox_labels
        if (bot.inboxLabelsEnabled) {
          console.log(`🏷️ Adding label to conversation for user ${senderPsid}`);
          let conversation = await Conversation.findOne({ botId: bot._id, userId: senderPsid });
          if (conversation) {
            conversation.label = 'active';
            await conversation.save();
          }
        }

        // التعامل مع الـ response_feedback
        if (webhookEvent.response_feedback) {
          const feedbackData = webhookEvent.response_feedback;
          const mid = feedbackData.mid;
          const feedback = feedbackData.feedback;

          console.log(`📊 Feedback received from ${senderPsid}: ${feedback} for message ID: ${mid}`);

          const originalMessageId = messageIdCache.get(`${senderPsid}_${bot._id}`);
          if (originalMessageId) {
            await processFeedback(bot._id, senderPsid, originalMessageId, feedback);
            console.log(`✅ Feedback processed for original message ID: ${originalMessageId}`);
          } else {
            console.log(`⚠️ No original message ID found for feedback with ID: ${mid}`);
            await processFeedback(bot._id, senderPsid, mid, feedback);
          }
        }

        // التعامل مع الرسائل العادية
        if (webhookEvent.message && !webhookEvent.message_edit) {
          const message = webhookEvent.message;
          const mid = message.mid || `temp_${Date.now()}`;
          const messageContent = message.text || (message.attachments ? JSON.stringify(message.attachments) : 'رسالة غير نصية');

          messageIdCache.set(`${senderPsid}_${bot._id}`, mid);

          let responseText = '';

          if (message.text) {
            console.log(`📝 Text message received from ${senderPsid}: ${message.text}`);
            responseText = await processMessage(bot._id, senderPsid, message.text, false, false, mid);
          } else if (message.attachments) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image') {
              console.log(`🖼️ Image received from ${senderPsid}: ${attachment.payload.url}`);
              responseText = await processMessage(bot._id, senderPsid, attachment.payload.url, true, false, mid);
            } else if (attachment.type === 'audio') {
              console.log(`🎙️ Audio received from ${senderPsid}: ${attachment.payload.url}`);
              responseText = await processMessage(bot._id, senderPsid, attachment.payload.url, false, true, mid);
            } else {
              console.log(`📎 Unsupported attachment type from ${senderPsid}: ${attachment.type}`);
              responseText = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
            }
          } else {
            console.log(`❓ Unknown message type from ${senderPsid}`);
            responseText = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
          }

          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else if (!webhookEvent.response_feedback) {
          console.log('❌ No message or feedback found in webhook event:', webhookEvent);
        }
      }

      if (entry.changes && entry.changes.length > 0) {
        // التحقق من تفعيل ميزة الرد على الكومنتات
        if (!bot.commentsRepliesEnabled) {
          console.log(`⚠️ Comment replies disabled for bot ${bot.name} (ID: ${bot._id}), skipping comment processing.`);
          continue;
        }

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

            // تجاهل الكومنتات من الصفحة نفسها (ردود البوت)
            if (commenterId === bot.facebookPageId) {
              console.log(`⚠️ Skipping comment because commenterId (${commenterId}) is the page itself`);
              continue;
            }

            console.log(`💬 Comment received on post ${postId} from ${commenterName} (${commenterId}): ${message}`);

            const responseText = await processMessage(bot._id, commenterId, message, false, false, `comment_${commentId}`);
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
    console.log(`📤 Attempting to send message to ${senderPsid} with token: ${facebookApiKey.slice(0, 10)}...`);
    const requestBody = {
      recipient: { id: senderPsid },
      message: { text: responseText },
    };

    request(
      {
        uri: 'https://graph.facebook.com/v20.0/me/messages',
        qs: { access_token: facebookApiKey },
        method: 'POST',
        json: requestBody,
      },
      async (err, res, body) => {
        if (err) {
          console.error('❌ Error sending message to Facebook:', err.message, err.stack);
          return reject(err);
        }
        if (res.statusCode !== 200) {
          console.error('❌ Failed to send message to Facebook:', body);
          if (body.error && body.error.code === 190 && body.error.error_subcode === 463) {
            console.error('⚠️ Facebook Access Token has expired. Please update the token for this bot.');
            const bot = await Bot.findOne({ facebookApiKey });
            if (bot) {
              const notification = new Notification({
                user: bot.userId,
                title: `توكن فيسبوك منتهي`,
                message: `التوكن بتاع البوت ${bot.name} منتهي. من فضلك جدد التوكن من إعدادات فيسبوك.`,
                isRead: false,
              });
              await notification.save();
              console.log(`🔔 Notification sent to user ${bot.userId} for expired token`);
            }
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
    console.log(`📤 Attempting to reply to comment ${commentId} with token: ${facebookApiKey.slice(0, 10)}...`);
    const requestBody = {
      message: responseText,
    };

    request(
      {
        uri: `https://graph.facebook.com/v20.0/${commentId}/comments`,
        qs: { access_token: facebookApiKey },
        method: 'POST',
        json: requestBody,
      },
      async (err, res, body) => {
        if (err) {
          console.error('❌ Error replying to comment on Facebook:', err.message, err.stack);
          return reject(err);
        }
        if (res.statusCode !== 200) {
          console.error('❌ Failed to reply to comment on Facebook:', body);
          if (body.error && body.error.code === 190 && body.error.error_subcode === 463) {
            console.error('⚠️ Facebook Access Token has expired. Please update the token for this bot.');
            const bot = await Bot.findOne({ facebookApiKey });
            if (bot) {
              const notification = new Notification({
                user: bot.userId,
                title: `توكن فيسبوك منتهي`,
                message: `التوكن بتاع البوت ${bot.name} منتهي. من فضلك جدد التوكن من إعدادات فيسبوك.`,
                isRead: false,
              });
              await notification.save();
              console.log(`🔔 Notification sent to user ${bot.userId} for expired token`);
            }
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
