const axios = require('axios');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const { processMessage, processFeedback } = require('../botEngine');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// دالة لجلب اسم المستخدم من فيسبوك
const getFacebookUsername = async (userId, accessToken) => {
  try {
    // نزع أي بادئات زي facebook_ أو facebook_comment_
    const cleanUserId = userId.replace(/^(facebook_|facebook_comment_)/, '');
    console.log(`[${getTimestamp()}] 📋 محاولة جلب اسم المستخدم لـ ${cleanUserId} من فيسبوك باستخدام التوكن: ${accessToken.slice(0, 10)}...`);
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${cleanUserId}?fields=name&access_token=${accessToken}`,
      { timeout: 5000 } // إضافة timeout لتجنب الانتظار الطويل
    );
    if (response.data.name) {
      console.log(`[${getTimestamp()}] ✅ تم جلب اسم المستخدم من فيسبوك: ${response.data.name}`);
      return response.data.name;
    }
    console.log(`[${getTimestamp()}] ⚠️ لم يتم العثور على الاسم في الاستجابة:`, response.data);
    return cleanUserId;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب اسم المستخدم من فيسبوك لـ ${userId}:`, err.message, err.response?.data || {});
    return cleanUserId; // إرجاع الـ ID النظيف كبديل
  }
};

const handleMessage = async (req, res) => {
  try {
    console.log(`[${getTimestamp()}] 📩 Webhook POST request received`);

    const body = req.body;
    if (body.object !== 'page') {
      console.log(`[${getTimestamp()}] ⚠️ Ignored non-page webhook event: ${body.object}`);
      return res.status(200).send('EVENT_RECEIVED');
    }

    for (const entry of body.entry) {
      const pageId = entry.id;
      const bot = await Bot.findOne({ facebookPageId: pageId }).lean(); // استخدام lean لتقليل استهلاك الذاكرة
      if (!bot) {
        console.log(`[${getTimestamp()}] ❌ No bot found for page ID: ${pageId}`);
        continue;
      }
      if (!bot.isActive) {
        console.log(`[${getTimestamp()}] ⚠️ Bot ${bot.name} (ID: ${bot._id}) is inactive, skipping.`);
        continue;
      }

      // معالجة الرسايل فقط
      if (entry.messaging && entry.messaging.length > 0) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender?.id;
        const recipientId = webhookEvent.recipient?.id;

        if (!senderPsid || senderPsid === bot.facebookPageId || recipientId !== bot.facebookPageId) {
          console.log(`[${getTimestamp()}] ⚠️ Invalid message: sender=${senderPsid}, recipient=${recipientId}, pageId=${bot.facebookPageId}`);
          continue;
        }

        if (webhookEvent.message && !webhookEvent.message.is_echo) {
          const message = webhookEvent.message;
          const mid = message.mid || `temp_${Date.now()}`;
          let text = message.text || '';
          let isImage = false;
          let isVoice = false;
          let mediaUrl = null;

          if (message.text) {
            console.log(`[${getTimestamp()}] 📝 Text message received from facebook_${senderPsid}: ${text}`);
          } else if (message.attachments) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image') {
              isImage = true;
              mediaUrl = attachment.payload.url;
              text = '[صورة]';
              console.log(`[${getTimestamp()}] 🖼️ Image received from facebook_${senderPsid}: ${mediaUrl}`);
            } else if (attachment.type === 'audio') {
              isVoice = true;
              mediaUrl = attachment.payload.url;
              text = '';
              console.log(`[${getTimestamp()}] 🎙️ Audio received from facebook_${senderPsid}: ${mediaUrl}`);
            } else {
              console.log(`[${getTimestamp()}] 📎 Unsupported attachment type: ${attachment.type}`);
              text = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
            }
          } else {
            console.log(`[${getTimestamp()}] ❓ Unknown message type from facebook_${senderPsid}`);
            text = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
          }

          const prefixedSenderId = `facebook_${senderPsid}`;
          let conversation = await Conversation.findOne({
            botId: bot._id,
            channel: 'facebook',
            userId: prefixedSenderId
          }).lean();

          if (!conversation) {
            const username = await getFacebookUsername(prefixedSenderId, bot.facebookApiKey);
            conversation = new Conversation({
              botId: bot._id,
              channel: 'facebook',
              userId: prefixedSenderId,
              username: username,
              messages: []
            });
            await conversation.save();
          } else if (!conversation.username || conversation.username === "مستخدم فيسبوك") {
            const username = await getFacebookUsername(prefixedSenderId, bot.facebookApiKey);
            await Conversation.updateOne(
              { _id: conversation._id },
              { username: username }
            );
          }

          const responseText = await processMessage(bot._id, prefixedSenderId, text, isImage, isVoice, mid, 'facebook', mediaUrl);
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else {
          console.log(`[${getTimestamp()}] ⚠️ Ignored message: ${JSON.stringify(webhookEvent)}`);
        }
      }

      // معالجة الكومنتات فقط (item: comment, verb: add)
      if (entry.changes && entry.changes.length > 0 && bot.commentsRepliesEnabled) {
        for (const change of entry.changes) {
          if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
            const commentEvent = change.value;
            const commentId = commentEvent.comment_id;
            const postId = commentEvent.post_id;
            const message = commentEvent.message;
            const commenterId = commentEvent.from?.id;
            const commenterName = commentEvent.from?.name;

            if (!commenterId || !message || commenterId === bot.facebookPageId) {
              console.log(`[${getTimestamp()}] ❌ Invalid comment: commenterId=${commenterId}, message=${message}, pageId=${bot.facebookPageId}`);
              continue;
            }

            const prefixedCommenterId = `facebook_comment_${commenterId}`;
            let conversation = await Conversation.findOne({
              botId: bot._id,
              channel: 'facebook',
              userId: prefixedCommenterId
            }).lean();

            if (!conversation) {
              const username = await getFacebookUsername(commenterId, bot.facebookApiKey); // استخدام commenterId مباشرة
              conversation = new Conversation({
                botId: bot._id,
                channel: 'facebook',
                userId: prefixedCommenterId,
                username: username,
                messages: []
              });
              await conversation.save();
            } else if (!conversation.username || conversation.username === "مستخدم فيسبوك") {
              const username = await getFacebookUsername(commenterId, bot.facebookApiKey);
              await Conversation.updateOne(
                { _id: conversation._id },
                { username: username }
              );
            }

            console.log(`[${getTimestamp()}] 💬 Comment received on post ${postId} from ${commenterName} (${prefixedCommenterId}): ${message}`);
            const responseText = await processMessage(bot._id, prefixedCommenterId, message, false, false, `comment_${commentId}`, 'facebook');
            await replyToComment(commentId, responseText, bot.facebookApiKey);
          } else {
            console.log(`[${getTimestamp()}] ❌ Ignored non-comment or non-add event: ${JSON.stringify(change)}`);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in webhook: ${err.message}`, err.stack);
    res.sendStatus(500);
  } finally {
    // تنظيف الذاكرة
    req.body = null;
    global.gc && global.gc(); // استدعاء Garbage Collector إذا كان متاح
  }
};

const sendMessage = (senderPsid, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${senderPsid}`);
    const requestBody = {
      recipient: { id: senderPsid },
      message: { text: responseText }
    };
    axios.post(
      `https://graph.facebook.com/v22.0/me/messages`,
      requestBody,
      {
        params: { access_token: facebookApiKey },
        timeout: 5000 // إضافة timeout
      }
    ).then(response => {
      console.log(`[${getTimestamp()}] ✅ Message sent to ${senderPsid}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      console.error(`[${getTimestamp()}] ❌ Error sending message to Facebook:`, err.response?.data || err.message);
      reject(err);
    });
  });
};

const replyToComment = (commentId, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    console.log(`[${getTimestamp()}] 📤 Attempting to reply to comment ${commentId}`);
    const requestBody = {
      message: responseText
    };
    axios.post(
      `https://graph.facebook.com/v22.0/${commentId}/comments`,
      requestBody,
      {
        params: { access_token: facebookApiKey },
        timeout: 5000 // إضافة timeout
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
