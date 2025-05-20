const request = require('request');
const Conversation = require('../models/Conversation');
const Bot = require('../models/Bot');
const axios = require('axios');
const { processMessage } = require('../botEngine');

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

// إرسال رسالة عبر Instagram API (للرسائل في الماسنجر)
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
        if (body?.error?.error_subcode === 2534014) {
          console.error(`[${getTimestamp()}] ⚠️ User ${recipientId} cannot be found or is not available to receive messages. Skipping message sending.`);
          return resolve(); // نكمّل العملية بدون ما نفشلها
        }
        return reject(new Error('Failed to send message to Instagram'));
      }
      console.log(`[${getTimestamp()}] ✅ Message sent to ${recipientId}: ${messageText}`);
      resolve(body);
    });
  });
};

// إرسال رد على كومنت عبر Instagram API
const replyToComment = (commentId, messageText, accessToken) => {
  return new Promise((resolve, reject) => {
    request({
      url: `https://graph.instagram.com/v20.0/${commentId}/replies?access_token=${accessToken}`,
      method: 'POST',
      json: {
        message: messageText
      }
    }, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error(`[${getTimestamp()}] ❌ Failed to reply to comment ${commentId}:`, body?.error || error);
        if (body?.error?.error_subcode === 2534014) {
          console.error(`[${getTimestamp()}] ⚠️ Comment ${commentId} cannot be replied to. Skipping comment reply.`);
          return resolve(); // نكمّل العملية بدون ما نفشلها
        }
        return reject(new Error('Failed to reply to comment'));
      }
      console.log(`[${getTimestamp()}] ✅ Replied to comment ${commentId}: ${messageText}`);
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

// معالجة الرسائل والكومنتات القادمة من Instagram
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

      // معالجة الرسائل (Messaging Events)
      if (entry.messaging) {
        for (const event of entry.messaging) {
          const senderId = event.sender.id;
          const recipientId = event.recipient.id;
          const timestamp = event.timestamp;

          // إضافة بادئة instagram_ لمعرف المستخدم
          const prefixedSenderId = `instagram_${senderId}`;

          // تجاهل الرسائل المرسلة من الصفحة نفسها
          if (senderId === recipientId) {
            console.log(`[${getTimestamp()}] ⚠️ Ignoring message sent by the page itself: ${senderId}`);
            continue;
          }

          // تجاهل الرسائل اللي هي Echo Events (رسائل أرسلها البوت نفسه)
          if (event.message && event.message.is_echo) {
            console.log(`[${getTimestamp()}] ⚠️ Ignoring echo message from bot: ${senderId}`);
            continue;
          }

          // إنشاء أو تحديث المحادثة
          let conversation = await Conversation.findOne({
            botId: bot._id,
            platform: 'instagram',
            userId: prefixedSenderId
          });

          if (!conversation) {
            conversation = new Conversation({
              botId: bot._id,
              platform: 'instagram',
              userId: prefixedSenderId,
              messages: []
            });
            await conversation.save();
          }

          // إضافة ملصق "new_message" للمحادثة
          console.log(`[${getTimestamp()}] 🏷️ Adding label to conversation for user ${prefixedSenderId}`);
          conversation.labels = conversation.labels || [];
          if (!conversation.labels.includes('new_message')) {
            conversation.labels.push('new_message');
            await conversation.save();
          }

          // معالجة رسائل الترحيب (messaging_optins)
          if (event.optin && bot.instagramMessagingOptinsEnabled) {
            console.log(`📩 Processing opt-in event from ${prefixedSenderId}`);
            const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
            await sendMessage(senderId, welcomeMessage, bot.instagramApiKey);
            continue;
          } else if (event.optin && !bot.instagramMessagingOptinsEnabled) {
            console.log(`⚠️ Opt-in messages disabled for bot ${bot.name} (ID: ${bot._id}), skipping opt-in processing.`);
            continue;
          }

          // معالجة ردود الفعل (message_reactions)
          if (event.reaction && bot.instagramMessageReactionsEnabled) {
            console.log(`📩 Processing reaction event from ${prefixedSenderId}: ${event.reaction.reaction}`);
            const responseText = `شكرًا على تفاعلك (${event.reaction.reaction})!`;
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.reaction && !bot.instagramMessageReactionsEnabled) {
            console.log(`⚠️ Message reactions disabled for bot ${bot.name} (ID: ${bot._id}), skipping reaction processing.`);
            continue;
          }

          // معالجة تتبع المصدر (messaging_referrals)
          if (event.referral && bot.instagramMessagingReferralsEnabled) {
            console.log(`📩 Processing referral event from ${prefixedSenderId}: ${event.referral.ref}`);
            const responseText = `مرحبًا! وصلتني من ${event.referral.source}، كيف يمكنني مساعدتك؟`;
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.referral && !bot.instagramMessagingReferralsEnabled) {
            console.log(`⚠️ Messaging referrals disabled for bot ${bot.name} (ID: ${bot._id}), skipping referral processing.`);
            continue;
          }

          // معالجة تعديلات الرسائل (message_edits)
          if (event.message_edit && bot.instagramMessageEditsEnabled) {
            const editedMessage = event.message_edit.message;
            const mid = editedMessage.mid || `temp_${Date.now()}`;
            console.log(`📩 Processing message edit event from ${prefixedSenderId}: ${editedMessage.text}`);
            const responseText = await processMessage(bot._id, prefixedSenderId, editedMessage.text, false, false, mid);
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.message_edit && !bot.instagramMessageEditsEnabled) {
            console.log(`⚠️ Message edits disabled for bot ${bot.name} (ID: ${bot._id}), skipping message edit processing.`);
            continue;
          }

          // معالجة الرسالة
          if (event.message) {
            const messageId = event.message.mid || `msg_${Date.now()}`;
            let messageContent = '';
            let isImage = false;
            let isVoice = false;

            if (event.message.text) {
              messageContent = event.message.text;
              console.log(`[${getTimestamp()}] 📝 Text message received from ${prefixedSenderId}: ${messageContent}`);
            } else if (event.message.attachments) {
              const attachment = event.message.attachments[0];
              if (attachment.type === 'image') {
                isImage = true;
                messageContent = attachment.payload.url;
                console.log(`[${getTimestamp()}] 🖼️ Image received from ${prefixedSenderId}: ${messageContent}`);
              } else if (attachment.type === 'audio') {
                isVoice = true;
                messageContent = attachment.payload.url;
                console.log(`[${getTimestamp()}] 🎙️ Audio received from ${prefixedSenderId}: ${messageContent}`);
              } else {
                console.log(`[${getTimestamp()}] 📎 Unsupported attachment type from ${prefixedSenderId}: ${attachment.type}`);
                messageContent = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
              }
            } else {
              console.log(`[${getTimestamp()}] ⚠️ No text or attachments in message from ${prefixedSenderId}`);
              continue;
            }

            // معالجة الرسالة
            console.log(`[${getTimestamp()}] 🤖 Processing message for bot: ${bot._id} user: ${prefixedSenderId} message: ${messageContent}`);
            const reply = await processMessage(bot._id, prefixedSenderId, messageContent, isImage, isVoice, messageId);

            // إرسال الرد للمستخدم
            console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${senderId} with token: ${bot.instagramApiKey.slice(0, 10)}...`);
            await sendMessage(senderId, reply, bot.instagramApiKey);
          } else {
            console.log(`[${getTimestamp()}] ⚠️ Unhandled event type from ${prefixedSenderId}`);
          }
        }
      }

      // معالجة الكومنتات (Comments Events)
      if (entry.changes) {
        // التحقق من تفعيل ميزة الرد على الكومنتات
        if (!bot.instagramCommentsRepliesEnabled) {
          console.log(`[${getTimestamp()}] ⚠️ Comment replies disabled for bot ${bot.name} (ID: ${bot._id}), skipping comment processing.`);
          continue;
        }

        for (const change of entry.changes) {
          if (change.field === 'comments') {
            const comment = change.value;
            const commenterId = comment.from.id;
            const commentId = comment.id;
            const commentText = comment.text;

            // إضافة بادئة instagram_ لمعرف المستخدم
            const prefixedCommenterId = `instagram_${commenterId}`;

            // تجاهل الكومنتات المرسلة من الصفحة نفسها
            if (commenterId === pageId) {
              console.log(`[${getTimestamp()}] ⚠️ Ignoring comment sent by the page itself: ${commenterId}`);
              continue;
            }

            console.log(`[${getTimestamp()}] 💬 Comment received from ${prefixedCommenterId}: ${commentText}`);

            // إنشاء أو تحديث المحادثة
            let conversation = await Conversation.findOne({
              botId: bot._id,
              platform: 'instagram',
              userId: prefixedCommenterId
            });

            if (!conversation) {
              conversation = new Conversation({
                botId: bot._id,
                platform: 'instagram',
                userId: prefixedCommenterId,
                messages: []
              });
              await conversation.save();
            }

            // إضافة ملصق "new_comment" للمحادثة
            console.log(`[${getTimestamp()}] 🏷️ Adding label to conversation for user ${prefixedCommenterId}`);
            conversation.labels = conversation.labels || [];
            if (!conversation.labels.includes('new_comment')) {
              conversation.labels.push('new_comment');
              await conversation.save();
            }

            // معالجة الكومنت
            console.log(`[${getTimestamp()}] 🤖 Processing comment for bot: ${bot._id} user: ${prefixedCommenterId} comment: ${commentText}`);
            const reply = await processMessage(bot._id, prefixedCommenterId, commentText, false, false, commentId);

            // إرسال الرد على الكومنت
            console.log(`[${getTimestamp()}] 📤 Attempting to reply to comment ${commentId} with token: ${bot.instagramApiKey.slice(0, 10)}...`);
            await replyToComment(commentId, reply, bot.instagramApiKey);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in handleMessage:`, err.message, err.stack);
    res.sendStatus(500);
  }
};

module.exports = { verifyWebhook, handleMessage };
