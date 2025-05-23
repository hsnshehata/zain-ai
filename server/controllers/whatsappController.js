// server/controllers/whatsappController.js
const axios = require('axios');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const { processMessage } = require('../botEngine');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// التحقق من صلاحية التوكن
const validateAccessToken = async (accessToken) => {
  if (!accessToken) {
    console.error(`[${getTimestamp()}] ❌ No WhatsApp access token provided`);
    return false;
  }

  try {
    const response = await axios.get(
      `https://graph.whatsapp.com/v22.0/me?access_token=${accessToken}`
    );
    if (response.data.id) {
      console.log(`[${getTimestamp()}] ✅ WhatsApp access token is valid`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ WhatsApp access token validation failed:`, err.response?.data || err.message);
    return false;
  }
};

// محاولة تجديد التوكن
const refreshWhatsAppToken = async (bot) => {
  try {
    if (!bot.whatsappApiKey) {
      console.error(`[${getTimestamp()}] ❌ No existing WhatsApp token to refresh for bot ${bot._id}`);
      return null;
    }

    // تجديد التوكن باستخدام Meta API
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${bot.whatsappBusinessAccountId}/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: bot.whatsappApiKey
        }
      }
    );

    const newToken = response.data.access_token;
    if (newToken) {
      // التحقق من صلاحية التوكن الجديد
      const isValid = await validateAccessToken(newToken);
      if (!isValid) {
        console.error(`[${getTimestamp()}] ❌ Refreshed WhatsApp token is invalid for bot ${bot._id}`);
        return null;
      }

      bot.whatsappApiKey = newToken;
      bot.lastWhatsappTokenRefresh = new Date();
      await bot.save();
      console.log(`[${getTimestamp()}] ✅ WhatsApp access token refreshed for bot ${bot._id}`);
      return newToken;
    }
    return null;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Failed to refresh WhatsApp token:`, err.response?.data || err.message);
    return null;
  }
};

// التحقق من الـ Webhook
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === 'hassanshehata') {
      console.log(`[${getTimestamp()}] ✅ WhatsApp Webhook verified successfully`);
      return res.status(200).send(challenge);
    } else {
      console.log(`[${getTimestamp()}] ⚠️ Webhook verification failed: Invalid token`);
      return res.sendStatus(403);
    }
  }
  console.log(`[${getTimestamp()}] ⚠️ Webhook verification failed: Missing parameters`);
  res.sendStatus(400);
};

// معالجة الرسائل القادمة من واتساب
const handleMessage = async (req, res) => {
  try {
    const body = req.body;
    console.log(`[${getTimestamp()}] 📩 WhatsApp Webhook POST request received:`, JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      console.log(`[${getTimestamp()}] ⚠️ Ignored non-WhatsApp webhook event:`, body.object);
      return res.sendStatus(400);
    }

    for (const entry of body.entry) {
      const wabaId = entry.id;
      const bot = await Bot.findOne({ whatsappBusinessAccountId: wabaId });
      if (!bot) {
        console.log(`[${getTimestamp()}] ❌ No bot found for WhatsApp Business Account ID: ${wabaId}`);
        continue;
      }

      if (!bot.whatsappApiKey || !bot.whatsappBusinessAccountId) {
        console.log(`[${getTimestamp()}] ❌ Bot ${bot.name} (ID: ${bot._id}) is missing whatsappApiKey or whatsappBusinessAccountId`);
        await new Notification({
          user: bot.userId,
          title: 'خطأ في إعدادات واتساب',
          message: `البوت "${bot.name}" غير مربوط بحساب واتساب صالح. برجاء إعادة ربط الحساب.`,
          isRead: false
        }).save();
        continue;
      }

      // التحقق من صلاحية التوكن
      let isTokenValid = await validateAccessToken(bot.whatsappApiKey);
      if (!isTokenValid) {
        console.log(`[${getTimestamp()}] ⚠️ Attempting to refresh WhatsApp token for bot ${bot._id}`);
        const newToken = await refreshWhatsAppToken(bot);
        if (newToken) {
          isTokenValid = true;
          bot.whatsappApiKey = newToken; // تحديث التوكن في المتغير المحلي
        } else {
          console.error(`[${getTimestamp()}] ❌ Access token for bot ${bot._id} is invalid and could not be refreshed.`);
          await new Notification({
            user: bot.userId,
            title: 'خطأ في توكن واتساب',
            message: `التوكن بتاع واتساب للبوت "${bot.name}" مش صالح. برجاء إعادة ربط الحساب.`,
            isRead: false
          }).save();
          continue;
        }
      }

      // التحقق من حالة البوت
      if (!bot.isActive) {
        console.log(`[${getTimestamp()}] ⚠️ Bot ${bot.name} (ID: ${bot._id}) is inactive, skipping message processing.`);
        continue;
      }

      // معالجة الرسائل
      if (entry.changes && entry.changes.length > 0) {
        for (const change of entry.changes) {
          if (change.field !== 'messages') {
            console.log(`[${getTimestamp()}] ⚠️ Ignored non-message event: ${change.field}`);
            continue;
          }

          const messageEvent = change.value;
          if (messageEvent.messaging_product !== 'whatsapp') {
            console.log(`[${getTimestamp()}] ⚠️ Ignored non-WhatsApp messaging product`);
            continue;
          }

          const messages = messageEvent.messages || [];

          for (const message of messages) {
            const senderId = message.from;
            const phoneNumberId = messageEvent.metadata.phone_number_id;
            const prefixedSenderId = `whatsapp_${senderId}`;

            // تجاهل الرسائل المرسلة من الحساب نفسه
            if (senderId === messageEvent.metadata.display_phone_number) {
              console.log(`[${getTimestamp()}] ⚠️ Ignoring message sent by the account itself: ${senderId}`);
              continue;
            }

            // إنشاء أو تحديث المحادثة
            let conversation = await Conversation.findOne({
              botId: bot._id,
              platform: 'whatsapp',
              userId: prefixedSenderId
            });

            if (!conversation) {
              conversation = new Conversation({
                botId: bot._id,
                platform: 'whatsapp',
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

            // معالجة رسائل الترحيب (opt-ins)
            if (message.type === 'text' && bot.whatsappMessagingOptinsEnabled && !conversation.messages.length) {
              console.log(`[${getTimestamp()}] 📩 Processing opt-in event for ${prefixedSenderId}`);
              const welcomeMessage = bot.welcomeMessage || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
              await sendMessage(senderId, welcomeMessage, bot.whatsappApiKey, phoneNumberId, bot);
              continue;
            } else if (message.type === 'text' && !bot.whatsappMessagingOptinsEnabled && !conversation.messages.length) {
              console.log(`[${getTimestamp()}] ⚠️ Opt-in messages disabled for bot ${bot.name} (ID: ${bot._id}), skipping opt-in processing.`);
              continue;
            }

            // معالجة ردود الفعل (reactions)
            if (message.type === 'reaction' && bot.whatsappMessageReactionsEnabled) {
              console.log(`[${getTimestamp()}] 📩 Processing reaction event from ${prefixedSenderId}: ${message.reaction.emoji}`);
              const responseText = `شكرًا على تفاعلك (${message.reaction.emoji})!`;
              await sendMessage(senderId, responseText, bot.whatsappApiKey, phoneNumberId, bot);
              continue;
            } else if (message.type === 'reaction' && !bot.whatsappMessageReactionsEnabled) {
              console.log(`[${getTimestamp()}] ⚠️ Message reactions disabled for bot ${bot.name} (ID: ${bot._id}), skipping reaction processing.`);
              continue;
            }

            // معالجة تتبع المصدر (referrals)
            if (message.referral && bot.whatsappMessagingReferralsEnabled) {
              console.log(`[${getTimestamp()}] 📩 Processing referral event from ${prefixedSenderId}: ${message.referral.source}`);
              const responseText = `مرحبًا! وصلتني من ${message.referral.source}، كيف يمكنني مساعدتك؟`;
              await sendMessage(senderId, responseText, bot.whatsappApiKey, phoneNumberId, bot);
              continue;
            } else if (message.referral && !bot.whatsappMessagingReferralsEnabled) {
              console.log(`[${getTimestamp()}] ⚠️ Messaging referrals disabled for bot ${bot.name} (ID: ${bot._id}), skipping referral processing.`);
              continue;
            }

            // معالجة الرسائل (نصوص، صور، صوت)
            let responseText = '';
            const messageId = message.id || `msg_${Date.now()}`;

            if (message.type === 'text') {
              console.log(`[${getTimestamp()}] 📝 Text message received from ${prefixedSenderId}: ${message.text.body}`);
              responseText = await processMessage(bot._id, prefixedSenderId, message.text.body, false, false, messageId);
            } else if (message.type === 'image') {
              console.log(`[${getTimestamp()}] 🖼️ Image received from ${prefixedSenderId}: ${message.image.url}`);
              responseText = await processMessage(bot._id, prefixedSenderId, message.image.url, true, false, messageId);
            } else if (message.type === 'audio') {
              console.log(`[${getTimestamp()}] 🎙️ Audio received from ${prefixedSenderId}: ${message.audio.url}`);
              responseText = await processMessage(bot._id, prefixedSenderId, message.audio.url, false, true, messageId);
            } else {
              console.log(`[${getTimestamp()}] 📎 Unsupported message type from ${prefixedSenderId}: ${message.type}`);
              responseText = 'عذرًا، لا أستطيع معالجة هذا النوع من الرسائل حاليًا.';
            }

            // إرسال الرد للمستخدم
            console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${senderId} with token: ${bot.whatsappApiKey.slice(0, 10)}...`);
            await sendMessage(senderId, responseText, bot.whatsappApiKey, phoneNumberId, bot);
          }
        }
      }

      // معالجة الكومنتات (غير مدعومة حاليًا في واتساب، بس جاهزة للمستقبل)
      if (entry.changes && bot.whatsappCommentsRepliesEnabled) {
        console.log(`[${getTimestamp()}] ⚠️ Comment replies not supported for WhatsApp yet, skipping comment processing.`);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error in handleMessage:`, err.message, err.stack);
    res.sendStatus(500);
  }
};

// إرسال رسالة عبر WhatsApp API
const sendMessage = async (recipientId, messageText, accessToken, phoneNumberId, bot) => {
  try {
    console.log(`[${getTimestamp()}] 📤 Attempting to send message to ${recipientId} with token: ${accessToken.slice(0, 10)}...`);
    const response = await axios.post(
      `https://graph.whatsapp.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipientId,
        type: 'text',
        text: { body: messageText }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[${getTimestamp()}] ✅ Message sent to ${recipientId}: ${messageText}`);
    return response.data;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error sending message to WhatsApp:`, err.response?.data || err.message);
    if (err.response?.status === 401 || err.response?.data?.error?.code === 190) {
      console.log(`[${getTimestamp()}] ⚠️ Token invalid during sendMessage, attempting to refresh for bot ${bot._id}`);
      const newToken = await refreshWhatsAppToken(bot);
      if (newToken) {
        console.log(`[${getTimestamp()}] 📤 Retrying send message with new token: ${newToken.slice(0, 10)}...`);
        try {
          const retryResponse = await axios.post(
            `https://graph.whatsapp.com/v22.0/${phoneNumberId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: recipientId,
              type: 'text',
              text: { body: messageText }
            },
            {
              headers: {
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`[${getTimestamp()}] ✅ Message sent to ${recipientId} after token refresh: ${messageText}`);
          return retryResponse.data;
        } catch (retryErr) {
          console.error(`[${getTimestamp()}] ❌ Failed to send message after token refresh:`, retryErr.response?.data || retryErr.message);
          throw retryErr;
        }
      } else {
        console.error(`[${getTimestamp()}] ❌ Could not refresh token for bot ${bot._id}`);
        await new Notification({
          user: bot.userId,
          title: 'خطأ في توكن واتساب',
          message: `فشل تجديد توكن واتساب للبوت "${bot.name}". برجاء إعادة ربط الحساب.`,
          isRead: false
        }).save();
      }
    }
    throw err;
  }
};

module.exports = { verifyWebhook, handleMessage, sendMessage, validateAccessToken, refreshWhatsAppToken };
