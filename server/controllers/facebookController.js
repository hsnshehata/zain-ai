const axios = require('axios');
const winston = require('winston'); // إضافة winston للـ logging المتقدم
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const { processMessage, processFeedback } = require('../botEngine');

// إعداد winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // يمكن تغييره من الـ env (info للمهم، debug لكل حاجة)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }) // لوغز الأخطاء في فايل
  ],
});

// دالة لجلب اسم المستخدم من فيسبوك
const getFacebookUsername = async (userId, accessToken) => {
  try {
    const cleanUserId = userId.replace(/^(facebook_|facebook_comment_)/, '');
    logger.debug(`محاولة جلب اسم المستخدم لـ ${cleanUserId} من فيسبوك باستخدام التوكن: ${accessToken.slice(0, 10)}...`);
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${cleanUserId}?fields=name&access_token=${accessToken}`,
      {
        timeout: 5000,
      }
    );

    if (response.data.name) {
      logger.info(`تم جلب اسم المستخدم من فيسبوك: ${response.data.name}`);
      return response.data.name;
    }

    logger.warn(`لم يتم العثور على الاسم في الاستجابة: ${JSON.stringify(response.data)}`);
    return 'مستخدم فيسبوك';
  } catch (err) {
    logger.error(`خطأ في جلب اسم المستخدم من فيسبوك لـ ${userId}: ${err.message}`, { data: err.response?.data });
    
    if (err.response?.status === 400) {
      logger.warn(`الـ ID (${userId}) غير متاح أو لا يمكن الوصول إليه بسبب قيود الخصوصية`);
      return 'مستخدم فيسبوك';
    } else if (err.response?.status === 401) {
      logger.error(`التوكن غير صالح أو انتهت صلاحيته. يرجى التحقق من التوكن: ${accessToken.slice(0, 10)}...`);
      return 'مستخدم فيسبوك';
    }

    return userId.replace(/^(facebook_|facebook_comment_)/, '');
  }
};

const handleMessage = async (req, res) => {
  try {
    logger.info('Webhook POST request received'); // طابع بس المهم بدون الـ body كامل عشان نقلل الضغط

    const body = req.body;

    if (body.object !== 'page') {
      logger.debug(`Ignored non-page webhook event: ${body.object}`);
      return res.status(200).send('EVENT_RECEIVED');
    }

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ facebookPageId: pageId });
      if (!bot) {
        logger.warn(`No bot found for page ID: ${pageId}`);
        continue;
      }

      if (!bot.isActive) {
        logger.info(`Bot ${bot.name} (ID: ${bot._id}) is inactive, skipping message processing.`);
        continue;
      }

      if (entry.messaging && entry.messaging.length > 0) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender?.id;
        const recipientId = webhookEvent.recipient?.id;

        if (!senderPsid) {
          logger.warn('Sender PSID not found in webhook event');
          continue;
        }

        const prefixedSenderId = `facebook_${senderPsid}`;

        if (senderPsid === bot.facebookPageId) {
          logger.debug(`Skipping message because senderId (${senderPsid}) is the page itself`);
          continue;
        }

        if (recipientId !== bot.facebookPageId) {
          logger.debug(`Skipping message because recipientId (${recipientId}) does not match pageId (${bot.facebookPageId})`);
          continue;
        }

        if (webhookEvent.message && webhookEvent.message.is_echo) {
          logger.debug(`Ignoring echo message from bot: ${webhookEvent.message.text}`);
          continue;
        }

        const username = await getFacebookUsername(prefixedSenderId, bot.facebookApiKey);

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
          logger.info(`Processing opt-in event from ${prefixedSenderId}`);
          const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
          await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.optin && !bot.messagingOptinsEnabled) {
          logger.debug(`Opt-in messages disabled for bot ${bot.name} (ID: ${bot._id}), skipping opt-in processing.`);
          continue;
        }

        if (webhookEvent.reaction && bot.messageReactionsEnabled) {
          logger.info(`Processing reaction event from ${prefixedSenderId}: ${webhookEvent.reaction.reaction}`);
          const responseText = `شكرًا على تفاعلك (${webhookEvent.reaction.reaction})!`;
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.reaction && !bot.messageReactionsEnabled) {
          logger.debug(`Message reactions disabled for bot ${bot.name} (ID: ${bot._id}), skipping reaction processing.`);
          continue;
        }

        if (webhookEvent.referral && bot.messagingReferralsEnabled) {
          logger.info(`Processing referral event from ${prefixedSenderId}: ${webhookEvent.referral.ref}`);
          const responseText = `مرحبًا! وصلتني من ${webhookEvent.referral.source}، كيف يمكنني مساعدتك؟`;
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.referral && !bot.messagingReferralsEnabled) {
          logger.debug(`Messaging referrals disabled for bot ${bot.name} (ID: ${bot._id}), skipping referral processing.`);
          continue;
        }

        if (webhookEvent.message_edit && bot.messageEditsEnabled) {
          const editedMessage = webhookEvent.message_edit.message;
          const mid = editedMessage.mid || `temp_${Date.now()}`;
          logger.info(`Processing message edit event from ${prefixedSenderId}: ${editedMessage.text}`);
          const responseText = await processMessage(bot._id, prefixedSenderId, editedMessage.text, false, false, mid, 'facebook');
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          continue;
        } else if (webhookEvent.message_edit && !bot.messageEditsEnabled) {
          logger.debug(`Message edits disabled for bot ${bot.name} (ID: ${bot._id}), skipping message edit processing.`);
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
            logger.info(`Text message received from ${prefixedSenderId}: ${text}`);
          } else if (message.attachments) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image') {
              isImage = true;
              mediaUrl = attachment.payload.url;
              text = '[صورة]';
              logger.info(`Image received from ${prefixedSenderId}: ${mediaUrl}`);
            } else if (attachment.type === 'audio') {
              isVoice = true;
              mediaUrl = attachment.payload.url;
              text = '';
              logger.info(`Audio received from ${prefixedSenderId}: ${mediaUrl}`);
            } else {
              logger.warn(`Unsupported attachment type from ${prefixedSenderId}: ${attachment.type}`);
              text = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
            }
          } else {
            logger.warn(`Unknown message type from ${prefixedSenderId}`);
            text = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
          }

          logger.info(`Sending to botEngine: botId=${bot._id}, userId=${prefixedSenderId}, message=${text}, isImage=${isImage}, isVoice=${isVoice}, mediaUrl=${mediaUrl}`);
          const responseText = await processMessage(bot._id, prefixedSenderId, text, isImage, isVoice, mid, 'facebook', mediaUrl);
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else if (webhookEvent.response_feedback) {
          const feedbackData = webhookEvent.response_feedback;
          const mid = feedbackData.mid;
          const feedback = feedbackData.feedback;

          if (!mid || !feedback) {
            logger.warn(`Invalid feedback data: mid=${mid}, feedback=${feedback}`);
            continue;
          }

          logger.info(`Feedback received from ${prefixedSenderId}: ${feedback} for message ID: ${mid}`);
          await processFeedback(bot._id, prefixedSenderId, mid, feedback);
        } else {
          logger.warn('No message or feedback found in webhook event');
        }
      }

      if (entry.changes && entry.changes.length > 0) {
        if (!bot.commentsRepliesEnabled) {
          logger.debug(`Comment replies disabled for bot ${bot.name} (ID: ${bot._id}), skipping comment processing.`);
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
              logger.warn('Commenter ID or message not found in feed event');
              continue;
            }

            const prefixedCommenterId = `facebook_comment_${commenterId}`;

            if (commenterId === bot.facebookPageId) {
              logger.debug(`Skipping comment because commenterId (${commenterId}) is the page itself`);
              continue;
            }

            const username = await getFacebookUsername(prefixedCommenterId, bot.facebookApiKey);

            logger.info(`Comment received on post ${postId} from ${commenterName} (${prefixedCommenterId}): ${message}`);

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
            logger.debug('Not a comment event or not an "add" verb'); // طابع بس في debug level عشان ما يضغطش
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    logger.error('Error in webhook:', { message: err.message, stack: err.stack });
    res.sendStatus(500);
  }
};

const sendMessage = (senderPsid, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    logger.info(`Attempting to send message to ${senderPsid}`);
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
      logger.info(`Message sent to ${senderPsid}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      logger.error('Error sending message to Facebook:', { data: err.response?.data || err.message });
      reject(err);
    });
  });
};

const replyToComment = (commentId, responseText, facebookApiKey) => {
  return new Promise((resolve, reject) => {
    logger.info(`Attempting to reply to comment ${commentId}`);
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
      logger.info(`Replied to comment ${commentId}: ${responseText}`);
      resolve(response.data);
    }).catch(err => {
      logger.error('Error replying to comment on Facebook:', { data: err.response?.data || err.message });
      reject(err);
    });
  });
};

module.exports = { handleMessage, sendMessage };
