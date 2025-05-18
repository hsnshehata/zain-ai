const axios = require('axios');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const { processMessage, processFeedback } = require('../botEngine');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// توكن اختبار يدوي (هنشيله بعد الاختبار)
const TEST_TOKEN = 'EAAHF2zum6zEBOZCkRIu0rePQoVije6Chvz28O27tPNU9IXXveoZCUvZC1fMtYdMB4XHXSFwG1yWr7PTZCMmH2kalZBOyQZBxvTvIoaIQZCFDd39l04wu26UYLfXjHpYslFYuTsjpZBZAXj8SEnRlj3FSYjY2MuxlWaqcsc1ewh7sJEtHgfBqx6O6MKZBtg4asTbYqqoMCdSNbnINrK8z4ZD';

// دالة لجلب اسم المستخدم من فيسبوك باستخدام Graph API
async function getFacebookUsername(userId, facebookApiKey) {
  const apiKey = TEST_TOKEN || facebookApiKey; // استخدام توكن الاختبار إذا موجود
  if (!apiKey) {
    console.log(`[${getTimestamp()}] ⚠️ No facebookApiKey provided for user ${userId}`);
    return null;
  }
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${userId}?fields=name&access_token=${apiKey}`,
      { timeout: 5000 }
    );
    console.log(`[${getTimestamp()}] ✅ Fetched Facebook username for ${userId}: ${response.data.name}`);
    return response.data.name || null;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching Facebook username for ${userId}:`, err.response?.data?.error?.message || err.message);
    return null;
  }
}

const handleMessage = async (req, res) => {
  try {
    console.log(`[${getTimestamp()}] 📩 Webhook POST request received:`, JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (body.object !== 'page' && body.object !== 'instagram') {
      console.log(`[${getTimestamp()}] ❌ Invalid webhook event: Not a page or instagram object`);
      return res.sendStatus(404);
    }

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ $or: [{ facebookPageId: pageId }, { instagramPageId: pageId }] });
      if (!bot) {
        console.log(`[${getTimestamp()}] ❌ No bot found for page ID: ${pageId}`);
        continue;
      }

      // تحديد إذا كان الحدث من إنستجرام أو فيسبوك
      const isInstagram = bot.instagramPageId === pageId || body.object === 'instagram';

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

        // تجاهل الرسائل من الصفحة نفسها
        if (senderPsid === bot.facebookPageId || senderPsid === bot.instagramPageId) {
          console.log(`[${getTimestamp()}] ⚠️ Skipping message because senderId (${senderPsid}) is the page itself`);
          if (webhookEvent.message && webhookEvent.message.is_echo) {
            console.log(`[${getTimestamp()}] ⚠️ Ignoring echo message from bot: ${senderPsid}`);
          }
          continue;
        }

        // التحقق من الـ recipientId
        if (recipientId !== bot.facebookPageId && recipientId !== bot.instagramPageId) {
          console.log(`[${getTimestamp()}] ⚠️ Skipping message because recipientId (${recipientId}) does not match pageId (${bot.facebookPageId} or ${bot.instagramPageId})`);
          continue;
        }

        // تحديد userId بناءً على المنصة
        const userId = isInstagram ? `instagram_${senderPsid}` : senderPsid;

        // جلب اسم المستخدم
        let username = webhookEvent.sender?.name || webhookEvent.sender?.username || null;
        if (!isInstagram && !username && bot.facebookApiKey) {
          username = await getFacebookUsername(senderPsid, bot.facebookApiKey);
        }

        // إنشاء أو تحديث المحادثة
        let conversation = await Conversation.findOne({ botId: bot._id, userId });
        if (!conversation) {
          console.log(`[${getTimestamp()}] 📋 Creating new conversation for bot: ${bot._id}, user: ${userId}`);
          conversation = new Conversation({
            botId: bot._id,
            userId,
            username: username || `فيسبوك ID: ${senderPsid}`,
            messages: []
          });
        } else if (!conversation.username && username) {
          conversation.username = username; // تحديث الاسم لو موجود
        }
        await conversation.save();

        // معالجة رسائل الترحيب (messaging_optins)
        if (webhookEvent.optin && (isInstagram ? bot.instagramMessagingOptinsEnabled : bot.messagingOptinsEnabled)) {
          console.log(`[${getTimestamp()}] 📩 Processing opt-in event from ${userId}`);
          const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
          await sendMessage(senderPsid, welcomeMessage, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
          continue;
        } else if (webhookEvent.optin) {
          console.log(`[${getTimestamp()}] ⚠️ Opt-in messages disabled for bot ${bot.name} (ID: ${bot._id}), skipping opt-in processing.`);
          continue;
        }

        // معالجة ردود الفعل (message_reactions)
        if (webhookEvent.reaction && (isInstagram ? bot.instagramMessageReactionsEnabled : bot.messageReactionsEnabled)) {
          console.log(`[${getTimestamp()}] 📩 Processing reaction event from ${userId}: ${webhookEvent.reaction.reaction}`);
          const responseText = `شكرًا على تفاعلك (${webhookEvent.reaction.reaction})!`;
          await sendMessage(senderPsid, responseText, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
          continue;
        } else if (webhookEvent.reaction) {
          console.log(`[${getTimestamp()}] ⚠️ Message reactions disabled for bot ${bot.name} (ID: ${bot._id}), skipping reaction processing.`);
          continue;
        }

        // معالجة تتبع المصدر (messaging_referrals)
        if (webhookEvent.referral && (isInstagram ? bot.instagramMessagingReferralsEnabled : bot.messagingReferralsEnabled)) {
          console.log(`[${getTimestamp()}] 📩 Processing referral event from ${userId}: ${webhookEvent.referral.ref}`);
          const responseText = `مرحبًا! وصلتني من ${webhookEvent.referral.source}، كيف يمكنني مساعدتك؟`;
          await sendMessage(senderPsid, responseText, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
          continue;
        } else if (webhookEvent.referral) {
          console.log(`[${getTimestamp()}] ⚠️ Messaging referrals disabled for bot ${bot.name} (ID: ${bot._id}), skipping referral processing.`);
          continue;
        }

        // معالجة تعديلات الرسائل (message_edits)
        if (webhookEvent.message_edit && (isInstagram ? bot.instagramMessageEditsEnabled : bot.messageEditsEnabled)) {
          const editedMessage = webhookEvent.message_edit.message;
          const mid = editedMessage.mid || `temp_${Date.now()}`;
          console.log(`[${getTimestamp()}] 📩 Processing message edit event from ${userId}: ${editedMessage.text}`);
          conversation.messages.push({
            role: 'user',
            content: editedMessage.text,
            messageId: mid,
            timestamp: new Date()
          });
          await conversation.save();
          const responseText = await processMessage(bot._id, userId, editedMessage.text, false, false, mid);
          await sendMessage(senderPsid, responseText, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
          continue;
        } else if (webhookEvent.message_edit) {
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
            console.log(`[${getTimestamp()}] 📝 Text message received from ${userId}: ${message.text}`);
            conversation.messages.push({
              role: 'user',
              content: message.text,
              messageId: mid,
              timestamp: new Date()
            });
            await conversation.save();
            responseText = await processMessage(bot._id, userId, message.text, false, false, mid);
          } else if (message.attachments) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image') {
              console.log(`[${getTimestamp()}] 🖼️ Image received from ${userId}: ${attachment.payload.url}`);
              conversation.messages.push({
                role: 'user',
                content: attachment.payload.url,
                messageId: mid,
                timestamp: new Date()
              });
              await conversation.save();
              responseText = await processMessage(bot._id, userId, attachment.payload.url, true, false, mid);
            } else if (attachment.type === 'audio') {
              console.log(`[${getTimestamp()}] 🎙️ Audio received from ${userId}: ${attachment.payload.url}`);
              conversation.messages.push({
                role: 'user',
                content: attachment.payload.url,
                messageId: mid,
                timestamp: new Date()
              });
              await conversation.save();
              responseText = await processMessage(bot._id, userId, attachment.payload.url, false, true, mid);
            } else {
              console.log(`[${getTimestamp()}] 📎 Unsupported attachment type from ${userId}: ${attachment.type}`);
              responseText = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
              await sendMessage(senderPsid, responseText, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
              continue; // نقف هنا وما نكملش المعالجة
            }
          } else {
            console.log(`[${getTimestamp()}] ❓ Unknown message type from ${userId}`);
            responseText = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
            await sendMessage(senderPsid, responseText, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
            continue; // نقف هنا وما نكملش المعالجة
          }

          await sendMessage(senderPsid, responseText, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
        } else if (webhookEvent.response_feedback) {
          const feedbackData = webhookEvent.response_feedback;
          const mid = feedbackData.mid;
          const feedback = feedbackData.feedback;

          console.log(`[${getTimestamp()}] 📊 Feedback received from ${userId}: ${feedback} for message ID: ${mid}`);
          await processFeedback(bot._id, userId, mid, feedback);
        } else if (webhookEvent.read) {
          console.log(`[${getTimestamp()}] 📖 Read receipt received from ${userId} for message ID: ${webhookEvent.read.mid}`);
        } else {
          console.log(`[${getTimestamp()}] ⚠️ Unhandled event type from ${userId}`);
        }
      }

      if (entry.changes && entry.changes.length > 0) {
        // التحقق من تفعيل ميزة الرد على الكومنتات
        if (!(isInstagram ? bot.instagramCommentsRepliesEnabled : bot.commentsRepliesEnabled)) {
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
            const commenterName = commentEvent.from?.name || commentEvent.from?.username || null;

            if (!commenterId || !message) {
              console.log(`[${getTimestamp()}] ❌ Commenter ID or message not found in feed event:`, commentEvent);
              continue;
            }

            // تجاهل الكومنتات من الصفحة نفسها (ردود البوت)
            if (commenterId === bot.facebookPageId || commenterId === bot.instagramPageId) {
              console.log(`[${getTimestamp()}] ⚠️ Skipping comment because commenterId (${commenterId}) is the page itself`);
              continue;
            }

            // تحديد userId بناءً على المنصة
            const userId = isInstagram ? `instagram_${commenterId}` : commenterId;

            console.log(`[${getTimestamp()}] 💬 Comment received on post ${postId} from ${commenterName || userId} (${userId}): ${message}`);

            // إنشاء أو تحديث المحادثة
            let conversation = await Conversation.findOne({ botId: bot._id, userId });
            if (!conversation) {
              console.log(`[${getTimestamp()}] 📋 Creating new conversation for bot: ${bot._id}, user: ${userId}`);
              conversation = new Conversation({
                botId: bot._id,
                userId,
                username: commenterName || `فيسبوك ID: ${commenterId}`,
                messages: []
              });
            } else if (!conversation.username && commenterName) {
              conversation.username = commenterName; // تحديث الاسم لو موجود
            }
            await conversation.save();

            conversation.messages.push({
              role: 'user',
              content: message,
              messageId: `comment_${commentId}`,
              timestamp: new Date()
            });
            await conversation.save();

            const responseText = await processMessage(bot._id, userId, message, false, false, `comment_${commentId}`);
            await replyToComment(commentId, responseText, isInstagram ? bot.instagramApiKey : bot.facebookApiKey);
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

const sendMessage = (senderPsid, responseText, apiKey) => {
  return new Promise((resolve, reject) => {
    console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${senderPsid} with token: ${apiKey.slice(0, 10)}...`);
    const requestBody = {
      recipient: { id: senderPsid },
      message: { text: responseText },
    };

    axios.post(
      `https://graph.facebook.com/v20.0/me/messages`,
      requestBody,
      {
        params: { access_token: apiKey },
      }
    ).then(response => {
      console.log(`[${getTimestamp()}] ✅ Message sent to ${senderPsid}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      console.error(`[${getTimestamp()}] ❌ Error sending message:`, err.response?.data || err.message);
      reject(err);
    });
  });
};

const replyToComment = (commentId, responseText, apiKey) => {
  return new Promise((resolve, reject) => {
    console.log(`[${getTimestamp()}] 📤 Attempting to reply to comment ${commentId} with token: ${apiKey.slice(0, 10)}...`);
    const requestBody = {
      message: responseText,
    };

    axios.post(
      `https://graph.facebook.com/v20.0/${commentId}/comments`,
      requestBody,
      {
        params: { access_token: apiKey },
      }
    ).then(response => {
      console.log(`[${getTimestamp()}] ✅ Replied to comment ${commentId}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      console.error(`[${getTimestamp()}] ❌ Error replying to comment:`, err.response?.data || err.message);
      reject(err);
    });
  });
};

module.exports = { handleMessage, sendMessage };
