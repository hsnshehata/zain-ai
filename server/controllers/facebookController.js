const axios = require('axios');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const { processMessage, processFeedback } = require('../botEngine');
const logger = require('../logger');

const handleMessage = async (req, res) => {
  try {
    logger.info('fb_webhook_received', { body: req.body });

    const body = req.body;

    if (body.object !== 'page') {
      logger.warn('fb_ignored_non_page', { object: body.object });
      return res.status(200).send('EVENT_RECEIVED');
    }

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ facebookPageId: pageId });
      if (!bot) {
        logger.warn('fb_bot_not_found', { pageId });
        continue;
      }

      if (!bot.isActive) {
        logger.warn('fb_bot_inactive', { botId: bot._id, name: bot.name });
        continue;
      }

      if (entry.messaging && entry.messaging.length > 0) {
        for (const webhookEvent of entry.messaging) {
          const senderPsid = webhookEvent.sender?.id;
          const recipientId = webhookEvent.recipient?.id;

          if (!senderPsid) {
            logger.warn('fb_sender_missing', { event: webhookEvent });
            continue;
          }

          const prefixedSenderId = `facebook_${senderPsid}`;
          const isOwnerMessage = senderPsid === bot.facebookPageId;
          const pauseKeyword = (bot.ownerPauseKeyword || '').trim().toLowerCase();
          const pauseDurationMinutes = Number(bot.ownerPauseDurationMinutes) || 0;

          if (!isOwnerMessage && recipientId !== bot.facebookPageId) {
            logger.warn('fb_recipient_mismatch', { recipientId, pageId: bot.facebookPageId });
            continue;
          }

          // دعم كتم المحادثة عبر رسالة المالك سواء وصلت كـ echo أو كرسالة عادية
          const maybeOwnerText = webhookEvent.message?.text || '';
          if (pauseKeyword && isOwnerMessage && maybeOwnerText.toLowerCase().includes(pauseKeyword)) {
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
              logger.info('fb_owner_mute_applied', { userId: prefixedTargetUserId, until: targetConversation.mutedUntil, keyword: bot.ownerPauseKeyword });
            } else {
              logger.warn('fb_owner_keyword_no_recipient');
            }
          }

          if (webhookEvent.message && webhookEvent.message.is_echo) {
            const echoText = webhookEvent.message.text || '';
            logger.info('fb_echo_detected', { senderPsid, recipientId, echoText });
            if (pauseKeyword && echoText.toLowerCase().includes(pauseKeyword) && isOwnerMessage) {
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
                logger.info('fb_echo_mute_applied', { userId: prefixedTargetUserId, until: targetConversation.mutedUntil, keyword: bot.ownerPauseKeyword });
              } else {
                logger.warn('fb_echo_keyword_no_recipient');
              }
            }
            logger.info('fb_echo_ignored', { text: webhookEvent.message.text });
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
            logger.info('fb_optin', { userId: prefixedSenderId });
            const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
            await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
            continue;
          } else if (webhookEvent.optin && !bot.messagingOptinsEnabled) {
            logger.warn('fb_optin_disabled', { botId: bot._id });
            continue;
          }

          if (webhookEvent.reaction && bot.messageReactionsEnabled) {
            logger.info('fb_reaction', { userId: prefixedSenderId, reaction: webhookEvent.reaction.reaction });
            const responseText = `شكرًا على تفاعلك (${webhookEvent.reaction.reaction})!`;
            await sendMessage(senderPsid, responseText, bot.facebookApiKey);
            continue;
          } else if (webhookEvent.reaction && !bot.messageReactionsEnabled) {
            logger.warn('fb_reaction_disabled', { botId: bot._id });
            continue;
          }

          if (webhookEvent.referral && bot.messagingReferralsEnabled) {
            logger.info('fb_referral', { userId: prefixedSenderId, referral: webhookEvent.referral.ref });
            const responseText = `مرحبًا! وصلتني من ${webhookEvent.referral.source}، كيف يمكنني مساعدتك؟`;
            await sendMessage(senderPsid, responseText, bot.facebookApiKey);
            continue;
          } else if (webhookEvent.referral && !bot.messagingReferralsEnabled) {
            logger.warn('fb_referral_disabled', { botId: bot._id });
            continue;
          }

          if (webhookEvent.message_edit && bot.messageEditsEnabled) {
            const editedMessage = webhookEvent.message_edit.message || webhookEvent.message_edit;
            const mid = editedMessage?.mid || webhookEvent.message_edit.mid || `temp_${Date.now()}`;
            const editedText = editedMessage?.text || webhookEvent.message_edit.text || '';
            logger.info('fb_message_edit', { userId: prefixedSenderId, editedText });
            const responseText = await processMessage(bot._id, prefixedSenderId, editedText, false, false, mid, 'facebook');
            if (responseText === null) {
              logger.info('fb_muted_edit', { userId: prefixedSenderId });
              continue;
            }
            await sendMessage(senderPsid, responseText, bot.facebookApiKey);
            continue;
          } else if (webhookEvent.message_edit && !bot.messageEditsEnabled) {
            logger.warn('fb_message_edit_disabled', { botId: bot._id });
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
              logger.info('fb_text_message', { userId: prefixedSenderId });
            } else if (message.attachments) {
              const attachment = message.attachments[0];
              if (attachment.type === 'image') {
                isImage = true;
                mediaUrl = attachment.payload.url;
                text = '[صورة]';
                logger.info('fb_image_message', { userId: prefixedSenderId });
              } else if (attachment.type === 'audio') {
                isVoice = true;
                mediaUrl = attachment.payload.url;
                text = '';
                logger.info('fb_audio_message', { userId: prefixedSenderId });
              } else {
                logger.warn('fb_attachment_unsupported', { userId: prefixedSenderId, type: attachment.type });
                text = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
              }
            } else {
              logger.warn('fb_message_unknown', { userId: prefixedSenderId });
              text = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
            }

            logger.info('fb_send_to_botengine', { botId: bot._id, userId: prefixedSenderId, isImage, isVoice });
            const responseText = await processMessage(bot._id, prefixedSenderId, text, isImage, isVoice, mid, 'facebook', mediaUrl);
            if (responseText === null) {
              logger.info('fb_muted', { userId: prefixedSenderId });
              continue;
            }
            await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          } else if (webhookEvent.response_feedback) {
            const feedbackData = webhookEvent.response_feedback;
            const mid = feedbackData.mid;
            const feedback = feedbackData.feedback;

            if (!mid || !feedback) {
              logger.warn('fb_feedback_invalid', { mid, feedback });
              continue;
            }

            logger.info('fb_feedback_received', { userId: prefixedSenderId, feedback, mid });
            await processFeedback(bot._id, prefixedSenderId, mid, feedback);
          } else {
            logger.warn('fb_no_message_or_feedback', { event: webhookEvent });
          }
        }
      }

      if (entry.changes && entry.changes.length > 0) {
        if (!bot.commentsRepliesEnabled) {
          logger.warn('fb_comments_disabled', { botId: bot._id });
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
              logger.warn('fb_comment_missing_data', { commentEvent });
              continue;
            }

            const prefixedCommenterId = `facebook_comment_${commenterId}`;

            if (commenterId === bot.facebookPageId) {
              logger.warn('fb_comment_page_self', { commenterId });
              continue;
            }

            // حذف جلب اسم المعلق من فيسبوك واستخدام اسم افتراضي
            const username = 'مستخدم فيسبوك';

            logger.info('fb_comment_received', { postId, commenterId: prefixedCommenterId });

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

            const mode = bot.commentReplyMode || 'ai';

            if (mode === 'keyword') {
              let reply = null;
              const lowerMessage = message.toLowerCase();

              if (bot.commentKeywords && bot.commentKeywords.length > 0) {
                for (const kwSetting of bot.commentKeywords) {
                  const match = kwSetting.keywords.some(k => {
                    const lowerK = k.trim().toLowerCase();
                    return kwSetting.matchType === 'exact' ? lowerMessage === lowerK : lowerMessage.includes(lowerK);
                  });
                  if (match) {
                    reply = kwSetting.reply;
                    break;
                  }
                }
              }

              if (!reply && bot.commentDefaultReply) {
                reply = bot.commentDefaultReply;
              }

              if (reply) {
                logger.info('fb_comment_keyword_reply', { commentId, reply });
                await replyToComment(commentId, reply, bot.facebookApiKey);
              } else {
                logger.info('fb_comment_no_keyword_match', { commentId });
              }
              continue;
            }

            if (mode === 'private') {
              logger.info('fb_comment_private_mode', { commentId });

              // 1. Public Reply
              if (bot.privateReplyMessage) {
                await replyToComment(commentId, bot.privateReplyMessage, bot.facebookApiKey);
              }

              // 2. Private AI Reply
              const responseText = await processMessage(bot._id, prefixedCommenterId, message, false, false, `comment_${commentId}`, 'facebook');

              if (responseText) {
                try {
                  await sendPrivateReply(commentId, responseText, bot.facebookApiKey);
                } catch (err) {
                  logger.error('fb_private_reply_failed', { err: err.message });
                  // Fallback or log?
                }
              }
              continue;
            }

            // Default: 'ai' mode
            const responseText = await processMessage(bot._id, prefixedCommenterId, message, false, false, `comment_${commentId}`, 'facebook');
            if (responseText === null) {
              logger.info('fb_comment_muted', { userId: prefixedCommenterId });
              continue;
            }
            await replyToComment(commentId, responseText, bot.facebookApiKey);
          } else {
            logger.warn('fb_comment_not_add', { change });
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    logger.error('fb_webhook_error_outer', { err: err.message, stack: err.stack });
    res.sendStatus(500);
  }
};

const sendMessage = (senderPsid, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    logger.info('fb_send_message_attempt', { senderPsid });
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
      logger.info('fb_send_message_success', { senderPsid });
      resolve(response.data);
    }).catch(err => {
      logger.error('fb_send_message_error', { err: err.response?.data || err.message });
      reject(err);
    });
  });
};

const replyToComment = (commentId, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    logger.info('fb_reply_comment_attempt', { commentId });
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
      logger.info('fb_reply_comment_success', { commentId });
      resolve(response.data);
    }).catch(err => {
      logger.error('fb_reply_comment_error', { err: err.response?.data || err.message });
      reject(err);
    });
  });
};

const sendPrivateReply = (commentId, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    logger.info('fb_send_private_reply_attempt', { commentId });
    const requestBody = {
      recipient: { comment_id: commentId },
      message: { text: responseText },
    };

    axios.post(
      `https://graph.facebook.com/v20.0/me/messages`,
      requestBody,
      {
        params: { access_token: facebookApiKey },
      }
    ).then(response => {
      logger.info('fb_send_private_reply_success', { commentId });
      resolve(response.data);
    }).catch(err => {
      logger.error('fb_send_private_reply_error', { err: err.response?.data || err.message });
      reject(err);
    });
  });
};

module.exports = { handleMessage, sendMessage, sendPrivateReply };
