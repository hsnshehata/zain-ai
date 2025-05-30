// server/controllers/facebookController.js
const axios = require('axios');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const { processMessage, processFeedback } = require('../botEngine');
const { getTimestamp } = require('./botsController');

// دالة لجلب اسم المستخدم من فيسبوك
const getFacebookUsername = async (userId, accessToken) => {
  try {
    const cleanUserId = userId.replace(/^(facebook_|facebook_comment_)/, '');
    console.log(`[${getTimestamp()}] 📋 محاولة جلب اسم المستخدم لـ ${cleanUserId} من فيسبوك باستخدام التوكن: ${accessToken.slice(0, 10)}...`);
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${cleanUserId}?fields=name&access_token=${accessToken}`
    );
    if (response.data.name) {
      console.log(`[${getTimestamp()}] ✅ تم جلب اسم المستخدم من فيسبوك: ${response.data.name}`);
      return response.data.name;
    }
    console.log(`[${getTimestamp()}] ⚠️ لم يتم العثور على الاسم في الاستجابة:`, response.data);
    return cleanUserId;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب اسم المستخدم من فيسبوك لـ ${userId}:`, err.message, err.response?.data);
    return userId.replace(/^(facebook_|facebook_comment_)/, '');
  }
};

const handleMessage = async (req, res) => {
  try {
    console.log(`[${getTimestamp()}] 📩 Webhook POST request received:`, JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (body.object !== 'page') {
      console.log(`[${getTimestamp()}] ⚠️ Ignored non-page webhook event:`, body.object);
      return res.status(200).send('EVENT_RECEIVED');
    }

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ facebookPageId: pageId });
      if (!bot) {
        console.log(`[${getTimestamp()}] ❌ No bot found for page ID: ${pageId}`);
        continue;
      }

      // التحقق من حالة البوت
      if (!bot.isActive) {
        console.log(`[${getTimestamp()}] ⚠️ Bot ${bot.name} (ID: ${bot._id}) is inactive, skipping message processing.`);
        continue;
      }

      if (entry.messaging && entry.messaging.length > 0) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender?.id;
        const recipientId = webhookEvent.recipient?.id;

        if (!senderPsid) {
          console.log(`[${getTimestamp()}] ❌ Sender PSID not found in webhook event:`, webhookEvent);
          continue;
        }

        // إضافة بادئة facebook_ لمعرف المستخدم (للرسايل)
        const prefixedSenderId = `facebook_${senderPsid}`;

        // Validate that senderId is not the page itself
        if (senderPsid === bot.facebookPageId) {
          console.log(`[${getTimestamp()}] ⚠️ Skipping message because senderId (${senderPsid}) is the page itself`);
          continue;
        }

        // Validate that recipientId matches the page
        if (recipientId !== bot.facebookPageId) {
          console.log(`[${getTimestamp()}] ⚠️ Skipping message because recipientId (${recipientId}) does not match pageId (${bot.facebookPageId})`);
          continue;
        }

        // Check if the message is an echo (sent by the bot itself)
        if (webhookEvent.message && webhookEvent.message.is_echo) {
          console.log(`[${getTimestamp()}] ⚠️ Ignoring echo message from bot: ${webhookEvent.message.text}`);
          continue;
        }

        // جلب اسم المستخدم من فيسبوك
        const username = await getFacebookUsername(prefixedSenderId, bot.facebookApiKey);

        // إنشاء أو تحديث المحادثة
        let conversation = await Conversation.findOne({
          botId: bot._id,
          channel: 'facebook',
          userId: prefixedSenderId
        });

        if (!conversation) {
          conversation = new Conversation({
            botId: bot._id,
            channel: 'facebook',
            userId: prefixedSenderId,
            username: username,
            messages: []
          });
          await conversation.save();
        } else if (!conversation.username || conversation.username === "مستخدم فيسبوك") {
          conversation.username = username;
          await conversation.save();
        }

        // معالجة رسائل الترحيب (messaging_optins)
        if (webhookEvent.optin && bot.messagingOptinsEnabled) {
          console.log(`[${getTimestamp()}] 📩 Processing opt-in event from ${prefixedSenderId}`);
          const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
          await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.optin && !bot.messagingOptinsEnabled) {
          console.log(`[${getTimestamp()}] ⚠️ Opt-in messages disabled for bot ${bot.name} (ID: ${bot._id}), skipping opt-in processing.`);
          continue;
        }

        // معالجة ردود الفعل (message_reactions)
        if (webhookEvent.reaction && bot.messageReactionsEnabled) {
          console.log(`[${getTimestamp()}] 📩 Processing reaction event from ${prefixedSenderId}: ${webhookEvent.reaction.reaction}`);
          const responseText = `شكرًا على تفاعلك (${webhookEvent.reaction.reaction})!`;
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.reaction && !bot.messageReactionsEnabled) {
          console.log(`[${getTimestamp()}] ⚠️ Message reactions disabled for bot ${bot.name} (ID: ${bot._id}), skipping reaction processing.`);
          continue;
        }

        // معالجة تتبع المصدر (messaging_referrals)
        if (webhookEvent.referral && bot.messagingReferralsEnabled) {
          console.log(`[${getTimestamp()}] 📩 Processing referral event from ${prefixedSenderId}: ${webhookEvent.referral.ref}`);
          const responseText = `مرحبًا! وصلتني من ${webhookEvent.referral.source}، كيف يمكنني مساعدتك؟`;
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.referral && !bot.messagingReferralsEnabled) {
          console.log(`[${getTimestamp()}] ⚠️ Messaging referrals disabled for bot ${bot.name} (ID: ${bot._id}), skipping referral processing.`);
          continue;
        }

        // معالجة تعديلات الرسائل (message_edits)
        if (webhookEvent.message_edit && bot.messageEditsEnabled) {
          const editedMessage = webhookEvent.message_edit.message;
          const mid = editedMessage.mid || `temp_${Date.now()}`;
          console.log(`[${getTimestamp()}] 📩 Processing message edit event from ${prefixedSenderId}: ${editedMessage.text}`);
          const responseText = await processMessage(bot._id, prefixedSenderId, editedMessage.text, false, false, mid, 'facebook');
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.message_edit && !bot.messageEditsEnabled) {
          console.log(`[${getTimestamp()}] ⚠️ Message edits disabled for bot ${bot.name} (ID: ${bot._id}), skipping message edit processing.`);
          continue;
        }

        // التعامل مع الرسائل العادية
        if (webhookEvent.message) {
          const message = webhookEvent.message;
          const mid = message.mid || `temp_${Date.now()}`;
          const messageContent = message.text || (message.attachments ? JSON.stringify(message.attachments) : 'رسالة غير نصية');

          let responseText = '';

          if (message.text) {
            console.log(`[${getTimestamp()}] 📝 Text message received from ${prefixedSenderId}: ${message.text}`);
            responseText = await processMessage(bot._id, prefixedSenderId, message.text, false, false, mid, 'facebook');
          } else if (message.attachments) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image') {
              console.log(`[${getTimestamp()}] 🖼️ Image received from ${prefixedSenderId}: ${attachment.payload.url}`);
              responseText = await processMessage(bot._id, prefixedSenderId, attachment.payload.url, true, false, mid, 'facebook');
            } else if (attachment.type === 'audio') {
              console.log(`[${getTimestamp()}] 🎙️ Audio received from ${prefixedSenderId}: ${attachment.payload.url}`);
              responseText = await processMessage(bot._id, prefixedSenderId, attachment.payload.url, false, true, mid, 'facebook');
            } else {
              console.log(`[${getTimestamp()}] 📎 Unsupported attachment type from ${prefixedSenderId}: ${attachment.type}`);
              responseText = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
            }
          } else {
            console.log(`[${getTimestamp()}] ❓ Unknown message type from ${prefixedSenderId}`);
            responseText = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
          }

          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else if (webhookEvent.response_feedback) {
          const feedbackData = webhookEvent.response_feedback;
          const mid = feedbackData.mid;
          const feedback = feedbackData.feedback;

          if (!mid || !feedback) {
            console.log(`[${getTimestamp()}] ❌ Invalid feedback data: mid=${mid}, feedback=${feedback}`);
            continue;
          }

          console.log(`[${getTimestamp()}] 📊 Feedback received from ${prefixedSenderId}: ${feedback} for message ID: ${mid}`);
          await processFeedback(bot._id, prefixedSenderId, mid, feedback);
        } else {
          console.log(`[${getTimestamp()}] ❌ No message or feedback found in webhook event:`, webhookEvent);
        }
      }

      if (entry.changes && entry.changes.length > 0) {
        // التحقق من تفعيل ميزة الرد على الكومنتات
        if (!bot.commentsRepliesEnabled) {
          console.log(`[${getTimestamp()}] ⚠️ Comment replies disabled for bot ${bot.name} (ID: ${bot._id}), skipping comment processing.`);
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
              console.log(`[${getTimestamp()}] ❌ Commenter ID or message not found in feed event:`, commentEvent);
              continue;
            }

            // إضافة بادئة facebook_comment_ لمعرف المستخدم (للتعليقات)
            const prefixedCommenterId = `facebook_comment_${commenterId}`;

            // تجاهل الكومنتات من الصفحة نفسها (ردود البوت)
            if (commenterId === bot.facebookPageId) {
              console.log(`[${getTimestamp()}] ⚠️ Skipping comment because commenterId (${commenterId}) is the page itself`);
              continue;
            }

            // جلب اسم المستخدم من فيسبوك
            const username = await getFacebookUsername(prefixedCommenterId, bot.facebookApiKey);

            console.log(`[${getTimestamp()}] 💬 Comment received on post ${postId} from ${commenterName} (${prefixedCommenterId}): ${message}`);

            // إنشاء أو تحديث المحادثة
            let conversation = await Conversation.findOne({
              botId: bot._id,
              channel: 'facebook',
              userId: prefixedCommenterId
            });

            if (!conversation) {
              conversation = new Conversation({
                botId: bot._id,
                channel: 'facebook',
                userId: prefixedCommenterId,
                username: username,
                messages: []
              });
              await conversation.save();
            } else if (!conversation.username || conversation.username === "مستخدم فيسبوك") {
              conversation.username = username;
              await conversation.save();
            }

            const responseText = await processMessage(bot._id, prefixedCommenterId, message, false, false, `comment_${commentId}`, 'facebook');
            await replyToComment(commentId, responseText, bot.facebookApiKey);
          } else {
            console.log(`[${getTimestamp()}] ❌ Not a comment event or not an "add" verb:`, change);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in webhook:`, err.message, err.stack);
    res.sendStatus(500);
  }
};

const sendMessage = (senderPsid, responseText, facebookApiKey, imageUrl = null) => {
  return new Promise((resolve, reject) => {
    console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${senderPsid} with token: ${facebookApiKey.slice(0, 10)}...`);
    const requestBody = {
      recipient: { id: senderPsid },
      message: {}
    };

    if (imageUrl) {
      requestBody.message = {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: true
          }
        }
      };
      if (responseText) {
        requestBody.message.text = responseText; // إضافة النص مع الصورة
      }
    } else {
      requestBody.message = { text: responseText };
    }

    axios.post(
      `https://graph.facebook.com/v20.0/me/messages`,
      requestBody,
      {
        params: { access_token: facebookApiKey },
      }
    ).then(response => {
      console.log(`[${getTimestamp()}] ✅ Message sent to ${senderPsid}: ${responseText}${imageUrl ? ` with image ${imageUrl}` : ''}`);
      resolve(response.data);
    }).catch(err => {
      console.error(`[${getTimestamp()}] ❌ Error sending message to Facebook:`, err.response?.data || err.message);
      reject(err);
    });
  });
};

const replyToComment = (commentId, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    console.log(`[${getTimestamp()}] 📤 Attempting to reply to comment ${commentId} with token: ${facebookApiKey.slice(0, 10)}...`);
    const requestBody = {
      message: responseText,
    };

    axios.post(
      `https://graph.facebook.com/v20.0/${commentId}/comments`,
      requestBody,
      {
        params: { access_token: facebookApiKey },
      }
    ).then(response => {
      console.log(`[${getTimestamp()}] ✅ Replied to comment ${commentId}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      console.error(`[${getTimestamp()}] ❌ Error replying to comment on Facebook:`, err.response?.data || err.message);
      reject(err);
    });
  });
};

module.exports = { handleMessage, sendMessage };
