const Conversation = require('../models/Conversation');
const Bot = require('../models/Bot');
const axios = require('axios');
const { processMessage } = require('../botEngine');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// دالة لجلب اسم المستخدم من إنستجرام
const getInstagramUsername = async (userId, accessToken) => {
  try {
    const cleanUserId = userId.replace(/^(instagram_|instagram_comment_)/, '');
    console.log(`[${getTimestamp()}] 📋 محاولة جلب اسم المستخدم لـ ${cleanUserId} من إنستجرام باستخدام التوكن: ${accessToken.slice(0, 10)}...`);
    const response = await axios.get(
      `https://graph.instagram.com/v22.0/${cleanUserId}?fields=name&access_token=${accessToken}`
    );
    if (response.data.name) {
      console.log(`[${getTimestamp()}] ✅ تم جلب اسم المستخدم من إنستجرام: ${response.data.name}`);
      return response.data.name;
    }
    console.log(`[${getTimestamp()}] ⚠️ لم يتم العثور على الاسم في الاستجابة:`, response.data);
    return cleanUserId;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب اسم المستخدم من إنستجرام لـ ${userId}:`, err.message, err.response?.data);
    return userId.replace(/^(instagram_|instagram_comment_)/, '');
  }
};

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

// إرسال رسالة عبر Instagram API
const sendMessage = async (recipientId, messageText, accessToken) => {
  try {
    const url = `https://graph.instagram.com/v20.0/me/messages?access_token=${accessToken}`;
    const payload = { recipient: { id: recipientId }, message: { text: messageText } };
    const res = await axios.post(url, payload);
    if (res.status < 200 || res.status >= 300) {
      const body = res.data;
      console.error(`[${getTimestamp()}] ❌ Failed to send message to Instagram:`, body?.error || res.status);
      if (body?.error?.error_subcode === 2534014) {
        console.error(`[${getTimestamp()}] ⚠️ User ${recipientId} cannot be found or is not available to receive messages. Skipping message sending.`);
        return;
      }
      throw new Error('Failed to send message to Instagram');
    }
    console.log(`[${getTimestamp()}] ✅ Message sent to ${recipientId}: ${messageText}`);
    return res.data;
  } catch (error) {
    const body = error.response?.data || null;
    console.error(`[${getTimestamp()}] ❌ Failed to send message to Instagram:`, body?.error || error.message);
    if (body?.error?.error_subcode === 2534014) {
      console.error(`[${getTimestamp()}] ⚠️ User ${recipientId} cannot be found or is not available to receive messages. Skipping message sending.`);
      return;
    }
    throw error;
  }
};

// إرسال رد على كومنت عبر Instagram API
const replyToComment = async (commentId, messageText, accessToken) => {
  try {
    const url = `https://graph.instagram.com/v20.0/${commentId}/replies?access_token=${accessToken}`;
    const res = await axios.post(url, { message: messageText });
    if (res.status < 200 || res.status >= 300) {
      const body = res.data;
      console.error(`[${getTimestamp()}] ❌ Failed to reply to comment ${commentId}:`, body?.error || res.status);
      if (body?.error?.error_subcode === 2534014) {
        console.error(`[${getTimestamp()}] ⚠️ Comment ${commentId} cannot be replied to. Skipping comment reply.`);
        return;
      }
      throw new Error('Failed to reply to comment');
    }
    console.log(`[${getTimestamp()}] ✅ Replied to comment ${commentId}: ${messageText}`);
    return res.data;
  } catch (error) {
    const body = error.response?.data || null;
    console.error(`[${getTimestamp()}] ❌ Failed to reply to comment ${commentId}:`, body?.error || error.message);
    if (body?.error?.error_subcode === 2534014) {
      console.error(`[${getTimestamp()}] ⚠️ Comment ${commentId} cannot be replied to. Skipping comment reply.`);
      return;
    }
    throw error;
  }
};

// التحقق من الـ Webhook
const verifyWebhook = (req, res) => {
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
const handleMessage = async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'instagram') {
      console.log(`[${getTimestamp()}] ⚠️ Ignored non-Instagram webhook event:`, body.object);
      return res.sendStatus(400);
    }

    console.log(`[${getTimestamp()}] 📩 Instagram Webhook POST request received:`, JSON.stringify(body, null, 2));

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ instagramPageId: pageId });
      if (!bot) {
        console.log(`[${getTimestamp()}] ❌ No bot found for Instagram page ID: ${pageId}`);
        continue;
      }

      const isTokenValid = await validateAccessToken(bot.instagramApiKey);
      if (!isTokenValid) {
        console.error(`[${getTimestamp()}] ❌ Access token for bot ${bot._id} is invalid. Please refresh the token.`);
        continue;
      }

      if (entry.messaging) {
        for (const event of entry.messaging) {
          const senderId = event.sender.id;
          const recipientId = event.recipient.id;
          const timestamp = event.timestamp;

          const prefixedSenderId = `instagram_${senderId}`;

          const pauseKeyword = (bot.ownerPauseKeyword || '').trim().toLowerCase();
          const pauseDurationMinutes = Number(bot.ownerPauseDurationMinutes) || 0;

          if (senderId === recipientId) {
            console.log(`[${getTimestamp()}] ⚠️ Ignoring message sent by the page itself: ${senderId}`);
            continue;
          }

          if (event.message && event.message.is_echo) {
            const echoText = event.message.text || '';
            if (pauseKeyword && echoText.toLowerCase().includes(pauseKeyword)) {
              const targetUserId = event.recipient?.id;
              if (targetUserId) {
                const prefixedTargetUserId = `instagram_${targetUserId}`;
                let targetConversation = await Conversation.findOne({
                  botId: bot._id,
                  channel: 'instagram',
                  userId: prefixedTargetUserId
                });

                if (!targetConversation) {
                  targetConversation = new Conversation({
                    botId: bot._id,
                    channel: 'instagram',
                    userId: prefixedTargetUserId,
                    username: 'مستخدم إنستجرام',
                    messages: []
                  });
                }

                const durationMs = pauseDurationMinutes > 0 ? pauseDurationMinutes * 60000 : 30 * 60000;
                targetConversation.mutedUntil = new Date(Date.now() + durationMs);
                targetConversation.mutedBy = 'owner_keyword';
                await targetConversation.save();
                console.log(`[${getTimestamp()}] 🔇 Applied mute for ${prefixedTargetUserId} until ${targetConversation.mutedUntil.toISOString()} using keyword "${bot.ownerPauseKeyword}"`);
              }
            }
            console.log(`[${getTimestamp()}] ⚠️ Ignoring echo message from bot: ${senderId}`);
            continue;
          }

          const username = await getInstagramUsername(prefixedSenderId, bot.instagramApiKey);

          let conversation = await Conversation.findOne({
            botId: bot._id,
            channel: 'instagram',
            userId: prefixedSenderId
          });

          if (!conversation) {
            conversation = new Conversation({
              botId: bot._id,
              channel: 'instagram',
              userId: prefixedSenderId,
              username: username,
              messages: []
            });
            await conversation.save();
          } else if (!conversation.username || conversation.username === "مستخدم إنستجرام") {
            conversation.username = username;
            await conversation.save();
          }

          console.log(`[${getTimestamp()}] 🏷️ Adding label to conversation for user ${prefixedSenderId}`);
          conversation.labels = conversation.labels || [];
          if (!conversation.labels.includes('new_message')) {
            conversation.labels.push('new_message');
            await conversation.save();
          }

          if (event.optin && bot.instagramMessagingOptinsEnabled) {
            console.log(`📩 Processing opt-in event from ${prefixedSenderId}`);
            const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
            await sendMessage(senderId, welcomeMessage, bot.instagramApiKey);
            continue;
          } else if (event.optin && !bot.instagramMessagingOptinsEnabled) {
            console.log(`⚠️ Opt-in messages disabled for bot ${bot.name} (ID: ${bot._id}), skipping opt-in processing.`);
            continue;
          }

          if (event.reaction && bot.instagramMessageReactionsEnabled) {
            console.log(`📩 Processing reaction event from ${prefixedSenderId}: ${event.reaction.reaction}`);
            const responseText = `شكرًا على تفاعلك (${event.reaction.reaction})!`;
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.reaction && !bot.instagramMessageReactionsEnabled) {
            console.log(`⚠️ Message reactions disabled for bot ${bot.name} (ID: ${bot._id}), skipping reaction processing.`);
            continue;
          }

          if (event.referral && bot.instagramMessagingReferralsEnabled) {
            console.log(`📩 Processing referral event from ${prefixedSenderId}: ${event.referral.ref}`);
            const responseText = `مرحبًا! وصلتني من ${event.referral.source}، كيف يمكنني مساعدتك؟`;
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.referral && !bot.instagramMessagingReferralsEnabled) {
            console.log(`⚠️ Messaging referrals disabled for bot ${bot.name} (ID: ${bot._id}), skipping referral processing.`);
            continue;
          }

          if (event.message_edit && bot.instagramMessageEditsEnabled) {
            const editedMessage = event.message_edit.message;
            const mid = editedMessage.mid || `temp_${Date.now()}`;
            console.log(`📩 Processing message edit event from ${prefixedSenderId}: ${editedMessage.text}`);
            const responseText = await processMessage(bot._id, prefixedSenderId, editedMessage.text, false, false, mid, 'instagram');
            if (responseText === null) {
              console.log(`[${getTimestamp()}] 🔇 Conversation for ${prefixedSenderId} muted, skipping reply to edited message.`);
              continue;
            }
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.message_edit && !bot.instagramMessageEditsEnabled) {
            console.log(`⚠️ Message edits disabled for bot ${bot.name} (ID: ${bot._id}), skipping message edit processing.`);
            continue;
          }

          if (event.message) {
            const messageId = event.message.mid || `msg_${Date.now()}`;
            let text = '';
            let isImage = false;
            let isVoice = false;
            let mediaUrl = null;

            if (event.message.text) {
              text = event.message.text;
              console.log(`[${getTimestamp()}] 📝 Text message received from ${prefixedSenderId}: ${text}`);
            } else if (event.message.attachments) {
              const attachment = event.message.attachments[0];
              if (attachment.type === 'image') {
                isImage = true;
                mediaUrl = attachment.payload.url;
                text = '[صورة]';
                console.log(`[${getTimestamp()}] 🖼️ Image received from ${prefixedSenderId}: ${mediaUrl}`);
              } else if (attachment.type === 'audio') {
                isVoice = true;
                mediaUrl = attachment.payload.url;
                text = '';
                console.log(`[${getTimestamp()}] 🎙️ Audio received from ${prefixedSenderId}: ${mediaUrl}`);
              } else {
                console.log(`[${getTimestamp()}] 📎 Unsupported attachment type from ${prefixedSenderId}: ${attachment.type}`);
                text = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
              }
            } else {
              console.log(`[${getTimestamp()}] ⚠️ No text or attachments in message from ${prefixedSenderId}`);
              continue;
            }

            console.log(`[${getTimestamp()}] 📤 Sending to botEngine: botId=${bot._id}, userId=${prefixedSenderId}, message=${text}, isImage=${isImage}, isVoice=${isVoice}, mediaUrl=${mediaUrl}`);
            const reply = await processMessage(bot._id, prefixedSenderId, text, isImage, isVoice, messageId, 'instagram', mediaUrl);

            if (reply === null) {
              console.log(`[${getTimestamp()}] 🔇 Conversation for ${prefixedSenderId} muted, skipping reply.`);
              continue;
            }

            console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${senderId} with token: ${bot.instagramApiKey.slice(0, 10)}...`);
            await sendMessage(senderId, reply, bot.instagramApiKey);
          } else {
            console.log(`[${getTimestamp()}] ⚠️ Unhandled event type from ${prefixedSenderId}`);
          }
        }
      }

      if (entry.changes) {
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

            const prefixedCommenterId = `instagram_comment_${commenterId}`;

            if (commenterId === pageId) {
              console.log(`[${getTimestamp()}] ⚠️ Ignoring comment sent by the page itself: ${commenterId}`);
              continue;
            }

            const username = await getInstagramUsername(prefixedCommenterId, bot.instagramApiKey);

            console.log(`[${getTimestamp()}] 💬 Comment received from ${prefixedCommenterId}: ${commentText}`);

            let conversation = await Conversation.findOne({
              botId: bot._id,
              channel: 'instagram',
              userId: prefixedCommenterId
            });

            if (!conversation) {
              conversation = new Conversation({
                botId: bot._id,
                channel: 'instagram',
                userId: prefixedCommenterId,
                username: username,
                messages: []
              });
              await conversation.save();
            } else if (!conversation.username || conversation.username === "مستخدم إنستجرام") {
              conversation.username = username;
              await conversation.save();
            }

            console.log(`[${getTimestamp()}] 🏷️ Adding label to conversation for user ${prefixedCommenterId}`);
            conversation.labels = conversation.labels || [];
            if (!conversation.labels.includes('new_comment')) {
              conversation.labels.push('new_comment');
              await conversation.save();
            }

            console.log(`[${getTimestamp()}] 🤖 Processing comment for bot: ${bot._id} user: ${prefixedCommenterId} comment: ${commentText}`);
            const reply = await processMessage(bot._id, prefixedCommenterId, commentText, false, false, commentId, 'instagram');

            if (reply === null) {
              console.log(`[${getTimestamp()}] 🔇 Conversation for ${prefixedCommenterId} muted, skipping comment reply.`);
              continue;
            }

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
