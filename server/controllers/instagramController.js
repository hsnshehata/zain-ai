const Conversation = require('../models/Conversation');
const Bot = require('../models/Bot');
const axios = require('axios');
const { processMessage } = require('../botEngine');
const logger = require('../logger');

// دالة لجلب اسم المستخدم من إنستجرام
const getInstagramUsername = async (userId, accessToken) => {
  try {
    const cleanUserId = userId.replace(/^(instagram_|instagram_comment_)/, '');
    logger.info('ig_get_username_attempt', { userId: cleanUserId });
    const response = await axios.get(
      `https://graph.instagram.com/v22.0/${cleanUserId}?fields=name&access_token=${accessToken}`
    );
    if (response.data.name) {
      logger.info('ig_get_username_success', { userId: cleanUserId });
      return response.data.name;
    }
    logger.warn('ig_get_username_no_name', { userId: cleanUserId });
    return cleanUserId;
  } catch (err) {
    logger.error('ig_get_username_error', { userId, err: err.message, data: err.response?.data });
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
      logger.info('ig_token_valid');
      return true;
    }
    return false;
  } catch (err) {
    logger.error('ig_token_invalid', { err: err.response?.data || err.message });
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
      logger.error('ig_send_message_failed', { error: body?.error || res.status });
      if (body?.error?.error_subcode === 2534014) {
        logger.warn('ig_send_message_user_unavailable', { recipientId });
        return;
      }
      throw new Error('Failed to send message to Instagram');
    }
    logger.info('ig_send_message_success', { recipientId });
    return res.data;
  } catch (error) {
    const body = error.response?.data || null;
    logger.error('ig_send_message_error', { error: body?.error || error.message });
    if (body?.error?.error_subcode === 2534014) {
      logger.warn('ig_send_message_user_unavailable', { recipientId });
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
      logger.error('ig_reply_comment_failed', { commentId, error: body?.error || res.status });
      if (body?.error?.error_subcode === 2534014) {
        logger.warn('ig_reply_comment_unavailable', { commentId });
        return;
      }
      throw new Error('Failed to reply to comment');
    }
    logger.info('ig_reply_comment_success', { commentId });
    return res.data;
  } catch (error) {
    const body = error.response?.data || null;
    logger.error('ig_reply_comment_error', { commentId, error: body?.error || error.message });
    if (body?.error?.error_subcode === 2534014) {
      logger.warn('ig_reply_comment_unavailable', { commentId });
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
        logger.info('ig_webhook_verified');
        return res.status(200).send(challenge);
      } else {
        logger.warn('ig_webhook_verify_failed');
        return res.sendStatus(403);
      }
    }
    logger.warn('ig_webhook_missing_params');
    res.sendStatus(400);
};

// معالجة الرسائل والكومنتات القادمة من Instagram
const handleMessage = async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'instagram') {
      logger.warn('ig_ignored_non_instagram', { object: body.object });
      return res.sendStatus(400);
    }

    logger.info('ig_webhook_received', { body });

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ instagramPageId: pageId });
      if (!bot) {
        logger.warn('ig_bot_not_found', { pageId });
        continue;
      }

      const isTokenValid = await validateAccessToken(bot.instagramApiKey);
      if (!isTokenValid) {
        logger.error('ig_bot_token_invalid', { botId: bot._id });
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
            logger.warn('ig_self_message', { senderId });
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
                logger.info('ig_owner_mute_applied', { userId: prefixedTargetUserId, until: targetConversation.mutedUntil, keyword: bot.ownerPauseKeyword });
              }
            }
            logger.info('ig_echo_ignored', { senderId });
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

          logger.info('ig_add_label', { userId: prefixedSenderId });
          conversation.labels = conversation.labels || [];
          if (!conversation.labels.includes('new_message')) {
            conversation.labels.push('new_message');
            await conversation.save();
          }

          if (event.optin && bot.instagramMessagingOptinsEnabled) {
            logger.info('ig_optin', { userId: prefixedSenderId });
            const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
            await sendMessage(senderId, welcomeMessage, bot.instagramApiKey);
            continue;
          } else if (event.optin && !bot.instagramMessagingOptinsEnabled) {
            logger.warn('ig_optin_disabled', { botId: bot._id });
            continue;
          }

          if (event.reaction && bot.instagramMessageReactionsEnabled) {
            logger.info('ig_reaction', { userId: prefixedSenderId, reaction: event.reaction.reaction });
            const responseText = `شكرًا على تفاعلك (${event.reaction.reaction})!`;
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.reaction && !bot.instagramMessageReactionsEnabled) {
            logger.warn('ig_reaction_disabled', { botId: bot._id });
            continue;
          }

          if (event.referral && bot.instagramMessagingReferralsEnabled) {
            logger.info('ig_referral', { userId: prefixedSenderId, referral: event.referral.ref });
            const responseText = `مرحبًا! وصلتني من ${event.referral.source}، كيف يمكنني مساعدتك؟`;
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.referral && !bot.instagramMessagingReferralsEnabled) {
            logger.warn('ig_referral_disabled', { botId: bot._id });
            continue;
          }

          if (event.message_edit && bot.instagramMessageEditsEnabled) {
            const editedMessage = event.message_edit.message;
            const mid = editedMessage.mid || `temp_${Date.now()}`;
            logger.info('ig_message_edit', { userId: prefixedSenderId });
            const responseText = await processMessage(bot._id, prefixedSenderId, editedMessage.text, false, false, mid, 'instagram');
            if (responseText === null) {
              logger.info('ig_muted_edit', { userId: prefixedSenderId });
              continue;
            }
            await sendMessage(senderId, responseText, bot.instagramApiKey);
            continue;
          } else if (event.message_edit && !bot.instagramMessageEditsEnabled) {
            logger.warn('ig_message_edit_disabled', { botId: bot._id });
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
              logger.info('ig_text_message', { userId: prefixedSenderId });
            } else if (event.message.attachments) {
              const attachment = event.message.attachments[0];
              if (attachment.type === 'image') {
                isImage = true;
                mediaUrl = attachment.payload.url;
                text = '[صورة]';
                logger.info('ig_image_message', { userId: prefixedSenderId });
              } else if (attachment.type === 'audio') {
                isVoice = true;
                mediaUrl = attachment.payload.url;
                text = '';
                logger.info('ig_audio_message', { userId: prefixedSenderId });
              } else {
                logger.warn('ig_attachment_unsupported', { userId: prefixedSenderId, type: attachment.type });
                text = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
              }
            } else {
              logger.warn('ig_message_no_content', { userId: prefixedSenderId });
              continue;
            }

            logger.info('ig_send_to_botengine', { botId: bot._id, userId: prefixedSenderId, isImage, isVoice });
            const reply = await processMessage(bot._id, prefixedSenderId, text, isImage, isVoice, messageId, 'instagram', mediaUrl);

            if (reply === null) {
              logger.info('ig_muted', { userId: prefixedSenderId });
              continue;
            }

            logger.info('ig_send_message_attempt', { senderId });
            await sendMessage(senderId, reply, bot.instagramApiKey);
          } else {
            logger.warn('ig_unhandled_event', { userId: prefixedSenderId });
          }
        }
      }

      if (entry.changes) {
        if (!bot.instagramCommentsRepliesEnabled) {
            logger.warn('ig_comments_disabled', { botId: bot._id });
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
                logger.warn('ig_comment_page_self', { commenterId });
              continue;
            }

            const username = await getInstagramUsername(prefixedCommenterId, bot.instagramApiKey);

              logger.info('ig_comment_received', { userId: prefixedCommenterId });

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

              logger.info('ig_comment_add_label', { userId: prefixedCommenterId });
            conversation.labels = conversation.labels || [];
            if (!conversation.labels.includes('new_comment')) {
              conversation.labels.push('new_comment');
              await conversation.save();
            }

              logger.info('ig_comment_processing', { botId: bot._id, userId: prefixedCommenterId });
            const reply = await processMessage(bot._id, prefixedCommenterId, commentText, false, false, commentId, 'instagram');

            if (reply === null) {
                logger.info('ig_comment_muted', { userId: prefixedCommenterId });
              continue;
            }

              logger.info('ig_reply_comment_attempt', { commentId });
            await replyToComment(commentId, reply, bot.instagramApiKey);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
      logger.error('ig_handle_error', { err: err.message, stack: err.stack });
    res.sendStatus(500);
  }
};

module.exports = { verifyWebhook, handleMessage };
