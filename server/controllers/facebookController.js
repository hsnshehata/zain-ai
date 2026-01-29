const axios = require('axios');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const { processMessage, processFeedback } = require('../botEngine');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

const handleMessage = async (req, res) => {
  try {
    console.log('📩 Webhook POST request received:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (body.object !== 'page') {
      console.log('⚠️ Ignored non-page webhook event:', body.object);
      return res.status(200).send('EVENT_RECEIVED');
    }

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ facebookPageId: pageId });
      if (!bot) {
        console.log(`❌ No bot found for page ID: ${pageId}`);
        continue;
      }

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

        const prefixedSenderId = `facebook_${senderPsid}`;

        if (recipientId !== bot.facebookPageId) {
          console.log(`⚠️ Skipping message because recipientId (${recipientId}) does not match pageId (${bot.facebookPageId})`);
          continue;
        }

        const pauseKeyword = (bot.ownerPauseKeyword || '').trim().toLowerCase();
        const pauseDurationMinutes = Number(bot.ownerPauseDurationMinutes) || 0;

        if (webhookEvent.message && webhookEvent.message.is_echo) {
          const echoText = webhookEvent.message.text || '';
          if (pauseKeyword && echoText.toLowerCase().includes(pauseKeyword)) {
            const targetUserId = webhookEvent.recipient?.id;
            if (targetUserId) {
              const prefixedTargetUserId = `facebook_${targetUserId}`;
              let targetConversation = await Conversation.findOne({
                botId: bot._id,
                channel: 'facebook',
                userId: prefixedTargetUserId
              });

              if (!targetConversation) {
                targetConversation = new Conversation({
                  botId: bot._id,
                  channel: 'facebook',
                  userId: prefixedTargetUserId,
                  username: 'مستخدم فيسبوك',
                  messages: []
                });
              }

              const durationMs = pauseDurationMinutes > 0 ? pauseDurationMinutes * 60000 : 30 * 60000;
              targetConversation.mutedUntil = new Date(Date.now() + durationMs);
              targetConversation.mutedBy = 'owner_keyword';
              await targetConversation.save();
              console.log(`🔇 Applied mute for ${prefixedTargetUserId} until ${targetConversation.mutedUntil.toISOString()} using keyword "${bot.ownerPauseKeyword}"`);
            }
          }
          console.log(`⚠️ Ignoring echo message from bot: ${webhookEvent.message.text}`);
          continue;
        }

        if (senderPsid === bot.facebookPageId) {
          console.log(`⚠️ Skipping message because senderId (${senderPsid}) is the page itself`);
          continue;
        }

        // تم حذف جلب الاسم من فيسبوك، واستخدمنا اسم افتراضي
        const username = 'مستخدم فيسبوك';

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

        if (webhookEvent.optin && bot.messagingOptinsEnabled) {
          console.log(`📩 Processing opt-in event from ${prefixedSenderId}`);
          const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
          await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.optin && !bot.messagingOptinsEnabled) {
          console.log(`⚠️ Opt-in messages disabled for bot ${bot.name} (ID: ${bot._id}), skipping opt-in processing.`);
          continue;
        }

        if (webhookEvent.reaction && bot.messageReactionsEnabled) {
          console.log(`📩 Processing reaction event from ${prefixedSenderId}: ${webhookEvent.reaction.reaction}`);
          const responseText = `شكرًا على تفاعلك (${webhookEvent.reaction.reaction})!`;
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.reaction && !bot.messageReactionsEnabled) {
          console.log(`⚠️ Message reactions disabled for bot ${bot.name} (ID: ${bot._id}), skipping reaction processing.`);
          continue;
        }

        if (webhookEvent.referral && bot.messagingReferralsEnabled) {
          console.log(`📩 Processing referral event from ${prefixedSenderId}: ${webhookEvent.referral.ref}`);
          const responseText = `مرحبًا! وصلتني من ${webhookEvent.referral.source}، كيف يمكنني مساعدتك؟`;
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.referral && !bot.messagingReferralsEnabled) {
          console.log(`⚠️ Messaging referrals disabled for bot ${bot.name} (ID: ${bot._id}), skipping referral processing.`);
          continue;
        }

        if (webhookEvent.message_edit && bot.messageEditsEnabled) {
          const editedMessage = webhookEvent.message_edit.message;
          const mid = editedMessage.mid || `temp_${Date.now()}`;
          console.log(`📩 Processing message edit event from ${prefixedSenderId}: ${editedMessage.text}`);
          const responseText = await processMessage(bot._id, prefixedSenderId, editedMessage.text, false, false, mid, 'facebook');
          if (responseText === null) {
            console.log(`🔇 Conversation for ${prefixedSenderId} muted, skipping reply to edited message.`);
            continue;
          }
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.message_edit && !bot.messageEditsEnabled) {
          console.log(`⚠️ Message edits disabled for bot ${bot.name} (ID: ${bot._id}), skipping message edit processing.`);
          continue;
        }

        if (webhookEvent.message) {
          const message = webhookEvent.message;
          const mid = message.mid || `temp_${Date.now()}`;
          let text = message.text || '';
          let isImage = false;
          let isVoice = false;
          let mediaUrl = null;

          if (message.text) {
            console.log(`📝 Text message received from ${prefixedSenderId}: ${text}`);
          } else if (message.attachments) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image') {
              isImage = true;
              mediaUrl = attachment.payload.url;
              text = '[صورة]';
              console.log(`🖼️ Image received from ${prefixedSenderId}: ${mediaUrl}`);
            } else if (attachment.type === 'audio') {
              isVoice = true;
              mediaUrl = attachment.payload.url;
              text = '';
              console.log(`🎙️ Audio received from ${prefixedSenderId}: ${mediaUrl}`);
            } else {
              console.log(`📎 Unsupported attachment type from ${prefixedSenderId}: ${attachment.type}`);
              text = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
            }
          } else {
            console.log(`❓ Unknown message type from ${prefixedSenderId}`);
            text = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
          }

          console.log(`📤 Sending to botEngine: botId=${bot._id}, userId=${prefixedSenderId}, message=${text}, isImage=${isImage}, isVoice=${isVoice}, mediaUrl=${mediaUrl}`);
          const responseText = await processMessage(bot._id, prefixedSenderId, text, isImage, isVoice, mid, 'facebook', mediaUrl);
          if (responseText === null) {
            console.log(`🔇 Conversation for ${prefixedSenderId} muted, skipping reply.`);
            continue;
          }
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else if (webhookEvent.response_feedback) {
          const feedbackData = webhookEvent.response_feedback;
          const mid = feedbackData.mid;
          const feedback = feedbackData.feedback;

          if (!mid || !feedback) {
            console.log(`❌ Invalid feedback data: mid=${mid}, feedback=${feedback}`);
            continue;
          }

          console.log(`📊 Feedback received from ${prefixedSenderId}: ${feedback} for message ID: ${mid}`);
          await processFeedback(bot._id, prefixedSenderId, mid, feedback);
        } else {
          console.log('❌ No message or feedback found in webhook event:', webhookEvent);
        }
      }

      if (entry.changes && entry.changes.length > 0) {
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

            const prefixedCommenterId = `facebook_comment_${commenterId}`;

            if (commenterId === bot.facebookPageId) {
              console.log(`⚠️ Skipping comment because commenterId (${commenterId}) is the page itself`);
              continue;
            }

            // حذف جلب اسم المعلق من فيسبوك واستخدام اسم افتراضي
            const username = 'مستخدم فيسبوك';

            console.log(`💬 Comment received on post ${postId} from ${commenterName} (${prefixedCommenterId}): ${message}`);

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
            if (responseText === null) {
              console.log(`🔇 Conversation for ${prefixedCommenterId} muted, skipping comment reply.`);
              continue;
            }
            await replyToComment(commentId, responseText, bot.facebookApiKey);
          } else {
            console.log('❌ Not a comment event or not an "add" verb:', change);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('❌ Error in webhook:', err.message, err.stack);
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

    axios.post(
      `https://graph.facebook.com/v20.0/me/messages`,
      requestBody,
      {
        params: { access_token: facebookApiKey },
      }
    ).then(response => {
      console.log(`✅ Message sent to ${senderPsid}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      console.error('❌ Error sending message to Facebook:', err.response?.data || err.message);
      reject(err);
    });
  });
};

const replyToComment = (commentId, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    console.log(`📤 Attempting to reply to comment ${commentId} with token: ${facebookApiKey.slice(0, 10)}...`);
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
      console.log(`✅ Replied to comment ${commentId}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      console.error('❌ Error replying to comment on Facebook:', err.response?.data || err.message);
      reject(err);
    });
  });
};

module.exports = { handleMessage, sendMessage };
