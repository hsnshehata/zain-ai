const request = require('request');
const Bot = require('../models/Bot');
const { processMessage } = require('../botEngine');
const Conversation = require('../models/Conversation');
const Feedback = require('../models/Feedback');

const handleMessage = async (req, res) => {
  try {
    console.log('📩 Webhook POST request received:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (body.object !== 'page') {
      console.log('❌ Invalid webhook event: Not a page object');
      return res.sendStatus(404);
    }

    for (const entry of body.entry) {
      const pageId = entry.id;

      const bot = await Bot.findOne({ facebookPageId: pageId });
      if (!bot) {
        console.log(`❌ No bot found for page ID: ${pageId}`);
        continue;
      }

      if (entry.messaging && entry.messaging.length > 0) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender?.id;

        if (!senderPsid) {
          console.log('❌ Sender PSID not found in webhook event:', webhookEvent);
          continue;
        }

        let conversation = await Conversation.findOne({
          botId: bot._id,
          userId: senderPsid,
        });

        if (!conversation) {
          conversation = new Conversation({
            botId: bot._id,
            userId: senderPsid,
            messages: [],
          });
          await conversation.save();
          console.log(`📋 Created new conversation for bot ${bot._id} and user ${senderPsid}`);

          // إرسال رسالة ترحيب إذا كان messaging_optins مفعل
          if (bot.messagingOptinsEnabled) {
            const welcomeMessage = 'مرحبًا! أنا هنا لمساعدتك. كيف يمكنني مساعدتك اليوم؟';
            await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
            conversation.messages.push({
              role: 'assistant',
              content: welcomeMessage,
            });
            await conversation.save();
          }
        }

        // التعامل مع الـ messaging_optins (إذا كان حدث اشتراك)
        if (webhookEvent.optin && bot.messagingOptinsEnabled) {
          console.log(`📩 Opt-in event received from ${senderPsid}`);
          const welcomeMessage = 'مرحبًا بك! شكرًا لاشتراكك. كيف يمكنني مساعدتك؟';
          await sendMessage(senderPsid, welcomeMessage, bot.facebookApiKey);
          conversation.messages.push({
            role: 'assistant',
            content: welcomeMessage,
          });
          await conversation.save();
        }

        // التعامل مع الـ message_reactions
        if (webhookEvent.reaction && bot.messageReactionsEnabled) {
          const reaction = webhookEvent.reaction.reaction;
          console.log(`😊 Reaction received from ${senderPsid}: ${reaction}`);
          let responseText = '';
          if (reaction === 'smile' || reaction === 'love') {
            responseText = 'شكرًا على التفاعل! 💖 كيف يمكنني مساعدتك أكثر؟';
          } else {
            responseText = 'أرى أنك تفاعلت مع الرسالة! كيف يمكنني مساعدتك الآن؟';
          }
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          conversation.messages.push({
            role: 'assistant',
            content: responseText,
          });
          await conversation.save();
        }

        // التعامل مع الـ messaging_referrals
        if (webhookEvent.referral && bot.messagingReferralsEnabled) {
          const referralSource = webhookEvent.referral.source;
          const referralRef = webhookEvent.referral.ref || 'unknown';
          console.log(`📈 Referral received from ${senderPsid}: Source=${referralSource}, Ref=${referralRef}`);
          const responseText = `مرحبًا! لقد وصلت إلينا من ${referralSource}. كيف يمكنني مساعدتك؟`;
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          conversation.messages.push({
            role: 'assistant',
            content: responseText,
          });
          await conversation.save();
        }

        // التعامل مع الـ message_edits
        if (webhookEvent.message && webhookEvent.message.is_edited && bot.messageEditsEnabled) {
          const editedMessage = webhookEvent.message.text;
          console.log(`✍️ Edited message received from ${senderPsid}: ${editedMessage}`);
          const responseText = await processMessage(bot._id, senderPsid, editedMessage);
          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
          conversation.messages.push({
            role: 'user',
            content: editedMessage,
            messageId: webhookEvent.message.mid,
          });
          conversation.messages.push({
            role: 'assistant',
            content: responseText,
            messageId: webhookEvent.message.mid,
          });
          await conversation.save();
        }

        // التعامل مع الـ inbox_labels (افتراضيًا، بناءً على منطق معين)
        if (bot.inboxLabelsEnabled) {
          // مثال بسيط: إضافة تصنيف "عميل جديد" لكل محادثة جديدة
          console.log(`🏷️ Adding label to conversation for user ${senderPsid}`);
          // ملاحظة: فيسبوك لا يدعم إضافة Labels مباشرة عبر الـ API حاليًا، لكن يمكن استخدام هذا لتخزين التصنيفات داخليًا
        }

        // التعامل مع الـ send_cart (افتراضيًا، لإرسال سلة تسوق)
        if (bot.sendCartEnabled && webhookEvent.message && webhookEvent.message.text.toLowerCase().includes('سلة')) {
          console.log(`🛒 Send cart request received from ${senderPsid}`);
          const cartMessage = 'إليك سلة التسوق الخاصة بك: (مثال) - منتج 1: 100 ريال، منتج 2: 50 ريال. هل تريد المتابعة للدفع؟';
          await sendMessage(senderPsid, cartMessage, bot.facebookApiKey);
          conversation.messages.push({
            role: 'assistant',
            content: cartMessage,
          });
          await conversation.save();
        }

        // باقي المنطق الحالي (التعامل مع الرسائل، التعليقات، التقييمات... إلخ)
        if (webhookEvent.response_feedback) {
          const feedbackData = webhookEvent.response_feedback;
          const mid = feedbackData.mid;
          const feedback = feedbackData.feedback;

          console.log(`📊 Feedback received from ${senderPsid}: ${feedback} for message ID: ${mid}`);

          conversation = await Conversation.findOne({
            botId: bot._id,
            userId: senderPsid,
          });

          if (!conversation) {
            console.log(`❌ Conversation not found for bot ${bot._id} and user ${senderPsid}`);
            conversation = new Conversation({
              botId: bot._id,
              userId: senderPsid,
              messages: [],
            });
            await conversation.save();
          }

          const lastBotMessage = [...conversation.messages]
            .reverse()
            .find(msg => msg.role === 'assistant');

          let messageContent = 'رسالة غير معروفة';
          let messageIdToUse = mid;

          if (lastBotMessage) {
            messageContent = lastBotMessage.content;
            messageIdToUse = lastBotMessage.messageId || mid;
            console.log(`✅ Linked feedback to last bot message: ${messageContent} (ID: ${messageIdToUse})`);
          } else {
            console.log(`⚠️ No previous bot message found for user ${senderPsid}. Saving feedback with provided mid.`);
          }

          const feedbackEntry = new Feedback({
            botId: bot._id,
            userId: senderPsid,
            messageId: messageIdToUse,
            feedback: feedback === 'Good response' ? 'positive' : 'negative',
            messageContent: lastBotMessage ? lastBotMessage.content : undefined,
            timestamp: new Date(webhookEvent.timestamp * 1000),
          });

          await feedbackEntry.save();
          console.log(`✅ Feedback saved: ${feedback} for message ID: ${messageIdToUse}`);
        }

        if (webhookEvent.message && !webhookEvent.message.is_edited) {
          const message = webhookEvent.message;
          const mid = message.mid || `temp_${Date.now()}`;

          console.log(`📝 Storing message with mid: ${mid}`);

          conversation.messages.push({
            role: 'user',
            content: message.text || 'رسالة غير نصية',
            messageId: mid,
          });

          let responseText = '';

          if (message.text) {
            console.log(`📝 Text message received from ${senderPsid}: ${message.text}`);
            responseText = await processMessage(bot._id, senderPsid, message.text);
          } else if (message.attachments) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image') {
              console.log(`🖼️ Image received from ${senderPsid}: ${attachment.payload.url}`);
              responseText = await processMessage(bot._id, senderPsid, attachment.payload.url, true);
            } else if (attachment.type === 'audio') {
              console.log(`🎙️ Audio received from ${senderPsid}: ${attachment.payload.url}`);
              responseText = await processMessage(bot._id, senderPsid, attachment.payload.url, false, true);
            } else {
              console.log(`📎 Unsupported attachment type from ${senderPsid}: ${attachment.type}`);
              responseText = 'عذرًا، لا أستطيع معالجة هذا النوع من المرفقات حاليًا.';
            }
          } else {
            console.log(`❓ Unknown message type from ${senderPsid}`);
            responseText = 'عذرًا، لا أستطيع فهم هذه الرسالة.';
          }

          conversation.messages.push({
            role: 'assistant',
            content: responseText,
            messageId: mid,
          });

          await conversation.save();
          console.log(`📋 Conversation updated with new message and response`);

          await sendMessage(senderPsid, responseText, bot.facebookApiKey);
        } else if (!webhookEvent.response_feedback) {
          console.log('❌ No message or feedback found in webhook event:', webhookEvent);
        }
      }

      if (entry.changes && entry.changes.length > 0) {
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

            console.log(`💬 Comment received on post ${postId} from ${commenterName} (${commenterId}): ${message}`);

            let conversation = await Conversation.findOne({
              botId: bot._id,
              userId: commenterId,
            });

            if (!conversation) {
              conversation = new Conversation({
                botId: bot._id,
                userId: commenterId,
                messages: [],
              });

              // إرسال رسالة ترحيب إذا كان messaging_optins مفعل
              if (bot.messagingOptinsEnabled) {
                const welcomeMessage = 'مرحبًا! أنا هنا لمساعدتك. كيف يمكنني مساعدتك اليوم؟';
                await sendMessage(commenterId, welcomeMessage, bot.facebookApiKey);
                conversation.messages.push({
                  role: 'assistant',
                  content: welcomeMessage,
                });
              }
            }

            conversation.messages.push({
              role: 'user',
              content: message,
            });

            const responseText = await processMessage(bot._id, commenterId, message);

            conversation.messages.push({
              role: 'assistant',
              content: responseText,
            });

            await conversation.save();

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
    const requestBody = {
      recipient: { id: senderPsid },
      message: { text: responseText },
    };

    request(
      {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: facebookApiKey },
        method: 'POST',
        json: requestBody,
      },
      (err, res, body) => {
        if (err) {
          console.error('❌ Error sending message to Facebook:', err.message, err.stack);
          return reject(err);
        }
        if (res.statusCode !== 200) {
          console.error('❌ Failed to send message to Facebook:', body);
          if (body.error && body.error.code === 190 && body.error.error_subcode === 463) {
            console.error('⚠️ Facebook Access Token has expired. Please update the token for this bot.');
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
    const requestBody = {
      message: responseText,
    };

    request(
      {
        uri: `https://graph.facebook.com/v22.0/${commentId}/comments`,
        qs: { access_token: facebookApiKey },
        method: 'POST',
        json: requestBody,
      },
      (err, res, body) => {
        if (err) {
          console.error('❌ Error replying to comment on Facebook:', err.message, err.stack);
          return reject(err);
        }
        if (res.statusCode !== 200) {
          console.error('❌ Failed to reply to comment on Facebook:', body);
          if (body.error && body.error.code === 190 && body.error.error_subcode === 463) {
            console.error('⚠️ Facebook Access Token has expired. Please update the token for this bot.');
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
