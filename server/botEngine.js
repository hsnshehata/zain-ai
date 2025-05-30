// server/botEngine.js
const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const Bot = require('./models/Bot');
const Rule = require('./models/Rule');
const Conversation = require('./models/Conversation');
const Feedback = require('./models/Feedback');
const { sendMessage: sendFacebookMessage } = require('./controllers/facebookController');
const { sendMessage: sendInstagramMessage } = require('./controllers/instagramController');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// دالة لجلب الوقت الحالي
function getCurrentTime() {
  return new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
}

async function transcribeAudio(audioUrl) {
  const body = new FormData();
  body.append('file', audioUrl);
  body.append('language', 'arabic');
  body.append('response_format', 'json');
  try {
    console.log(
      'LemonFox API Key: ' +
        (process.env.LEMONFOX_API_KEY ? 'تم جلب المفتاح' : 'المفتاح فاضي!')
    );
    const response = await axios.post(
      'https://api.lemonfox.ai/v1/audio/transcriptions',
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONFOX_API_KEY}`,
          ...body.getHeaders(),
        },
      }
    );
    console.log(`[${getCurrentTime()}] ✅ تم تحويل الصوت إلى نص:`, response.data);
    return response.data.text;
  } catch (err) {
    console.error(
      `[${getCurrentTime()}] ❌ خطأ في تحويل الصوت إلى نص:`,
      err.message,
      err.response?.data
    );
    return null;
  }
}

async function generateImage(prompt) {
  try {
    console.log(`[${getCurrentTime()}] 🖼️ جاري إنشاء صورة بناءً على النص: ${prompt}`);
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
    });
    console.log(`[${getCurrentTime()}] ✅ تم إنشاء الصورة بنجاح:`, response.data);
    return response.data[0].url;
  } catch (err) {
    console.error(`[${getCurrentTime()}] ❌ خطأ في إنشاء الصورة:`, err.message);
    return null;
  }
}

async function applyRules(message, botId) {
  try {
    console.log(`[${getCurrentTime()}] 🔍 جاري تطبيق القواعد على الرسالة: ${message}`);
    const rules = await Rule.find({ botId });
    for (const rule of rules) {
      if (rule.isActive) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(message)) {
          console.log(
            `[${getCurrentTime()}] ✅ تم العثور على قاعدة مطابقة:`,
            rule._id
          );
          return rule.response;
        }
      }
    }
    console.log(`[${getCurrentTime()}] ℹ️ لم يتم العثور على قواعد مطابقة`);
    return null;
  } catch (err) {
    console.error(
      `[${getCurrentTime()}] ❌ خطأ في تطبيق القواعد:`,
      err.message
    );
    return null;
  }
}

async function generateResponse(message, conversationHistory, botInstructions) {
  try {
    console.log(
      `[${getCurrentTime()}] 🤖 جاري إنشاء رد باستخدام OpenAI: ${message}`
    );
    const messages = [
      {
        role: 'system',
        content: botInstructions || 'أنت مساعد ذكي، قم بالرد بطريقة ودودة ومفيدة.',
      },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content.trim();
    console.log(`[${getCurrentTime()}] ✅ تم إنشاء الرد بنجاح: ${response}`);
    return response;
  } catch (err) {
    console.error(
      `[${getCurrentTime()}] ❌ خطأ في إنشاء الرد باستخدام OpenAI:`,
      err.message
    );
    return 'عذراً، حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى لاحقاً.';
  }
}

async function processMessage({ botId, userId, message, channel, messageId }) {
  try {
    console.log(
      `[${getCurrentTime()}] 📨 جاري معالجة الرسالة | Bot ID: ${botId} | User ID: ${userId} | Channel: ${channel} | Message: ${message}`
    );

    const bot = await Bot.findById(botId);
    if (!bot) {
      console.error(`[${getCurrentTime()}] ❌ البوت غير موجود: ${botId}`);
      return { success: false, message: 'البوت غير موجود' };
    }

    if (!bot.isActive) {
      console.log(`[${getCurrentTime()}] ⚠️ البوت غير مفعل: ${botId}`);
      return { success: false, message: 'البوت غير مفعل' };
    }

    let conversation = await Conversation.findOne({ botId, userId, channel });
    if (!conversation) {
      console.log(
        `[${getCurrentTime()}] 🆕 إنشاء محادثة جديدة لـ User ID: ${userId}`
      );
      conversation = new Conversation({
        botId,
        userId,
        channel,
        messages: [],
      });
    }

    if (messageId) {
      const messageExists = conversation.messages.some(
        (msg) => msg.messageId === messageId
      );
      if (messageExists) {
        console.log(
          `[${getCurrentTime()}] ⚠️ الرسالة تم معالجتها مسبقاً: ${messageId}`
        );
        return { success: false, message: 'الرسالة تم معالجتها مسبقاً' };
      }
    }

    conversation.messages.push({
      role: 'user',
      content: message,
      messageId: messageId || uuidv4(),
      timestamp: new Date(),
    });

    let response = await applyRules(message, botId);

    if (!response) {
      const conversationHistory = conversation.messages.slice(-10);
      const botInstructions = bot.welcomeMessage || null;
      response = await generateResponse(
        message,
        conversationHistory,
        botInstructions
      );
    }

    conversation.messages.push({
      role: 'assistant',
      content: response,
      messageId: uuidv4(),
      timestamp: new Date(),
    });

    await conversation.save();
    console.log(
      `[${getCurrentTime()}] 💾 تم حفظ المحادثة بنجاح | Conversation ID: ${conversation._id}`
    );

    let sendMessageResult;
    if (channel === 'facebook') {
      sendMessageResult = await sendFacebookMessage(
        botId,
        userId,
        response,
        null
      );
    } else if (channel === 'instagram') {
      sendMessageResult = await sendInstagramMessage(
        botId,
        userId,
        response,
        null
      );
    } else {
      console.error(
        `[${getCurrentTime()}] ❌ القناة غير مدعومة: ${channel}`
      );
      return { success: false, message: 'القناة غير مدعومة' };
    }

    if (!sendMessageResult.success) {
      console.error(
        `[${getCurrentTime()}] ❌ فشل إرسال الرد:`,
        sendMessageResult.message
      );
      return sendMessageResult;
    }

    // منطق الرسالة التلقائية
    if (
      (channel === 'facebook' && bot.facebookAutoMessageEnabled) ||
      (channel === 'instagram' && bot.instagramAutoMessageEnabled)
    ) {
      const autoMessageText =
        channel === 'facebook'
          ? bot.facebookAutoMessageText
          : bot.instagramAutoMessageText;
      const autoMessageImage =
        channel === 'facebook'
          ? bot.facebookAutoMessageImage
          : bot.instagramAutoMessageImage;
      const autoMessageDelay =
        channel === 'facebook'
          ? bot.facebookAutoMessageDelay
          : bot.instagramAutoMessageDelay;

      if (autoMessageText) {
        const lastAutoMessageSent = conversation.lastAutoMessageSent;
        const now = new Date();
        const fortyEightHours = 48 * 60 * 60 * 1000; // 48 ساعة بالمللي ثانية

        if (
          !lastAutoMessageSent ||
          now - new Date(lastAutoMessageSent) >= fortyEightHours
        ) {
          console.log(
            `[${getCurrentTime()}] ⏰ جدولة الرسالة التلقائية بعد ${autoMessageDelay} مللي ثانية`
          );
          setTimeout(async () => {
            try {
              let autoMessageResult;
              if (channel === 'facebook') {
                autoMessageResult = await sendFacebookMessage(
                  botId,
                  userId,
                  autoMessageText,
                  autoMessageImage
                );
              } else if (channel === 'instagram') {
                autoMessageResult = await sendInstagramMessage(
                  botId,
                  userId,
                  autoMessageText,
                  autoMessageImage
                );
              }

              if (autoMessageResult.success) {
                conversation.lastAutoMessageSent = new Date();
                conversation.messages.push({
                  role: 'assistant',
                  content: autoMessageText,
                  messageId: uuidv4(),
                  timestamp: new Date(),
                });
                await conversation.save();
                console.log(
                  `[${getCurrentTime()}] ✅ تم إرسال الرسالة التلقائية بنجاح | User ID: ${userId}`
                );
              } else {
                console.error(
                  `[${getCurrentTime()}] ❌ فشل إرسال الرسالة التلقائية:`,
                  autoMessageResult.message
                );
              }
            } catch (err) {
              console.error(
                `[${getCurrentTime()}] ❌ خطأ أثناء إرسال الرسالة التلقائية:`,
                err.message
              );
            }
          }, autoMessageDelay);
        } else {
          console.log(
            `[${getCurrentTime()}] ℹ️ الرسالة التلقائية لم تُرسل لأنها أُرسلت خلال الـ 48 ساعة الماضية`
          );
        }
      }
    }

    return { success: true, message: response };
  } catch (err) {
    console.error(
      `[${getCurrentTime()}] ❌ خطأ في معالجة الرسالة:`,
      err.message,
      err.stack
    );
    return { success: false, message: 'خطأ في معالجة الرسالة' };
  }
}

async function handleWebhookEvent(event) {
  try {
    console.log(
      `[${getCurrentTime()}] 🌐 تلقي حدث Webhook:`,
      JSON.stringify(event, null, 2)
    );

    if (event.object === 'page') {
      for (const entry of event.entry) {
        for (const messagingEvent of entry.messaging) {
          const botId = entry.id;
          const userId = messagingEvent.sender.id;
          const message = messagingEvent.message?.text;
          const messageId = messagingEvent.message?.mid;

          if (message) {
            return await processMessage({
              botId,
              userId,
              message,
              channel: 'facebook',
              messageId,
            });
          } else {
            console.log(
              `[${getCurrentTime()}] ℹ️ حدث Webhook غير مدعوم أو لا يحتوي على نص`
            );
          }
        }
      }
    } else if (event.object === 'instagram') {
      for (const entry of event.entry) {
        for (const messagingEvent of entry.messaging) {
          const botId = entry.id;
          const userId = messagingEvent.sender.id;
          const message = messagingEvent.message?.text;
          const messageId = messagingEvent.message?.mid;

          if (message) {
            return await processMessage({
              botId,
              userId,
              message,
              channel: 'instagram',
              messageId,
            });
          } else {
            console.log(
              `[${getCurrentTime()}] ℹ️ حدث Webhook غير مدعوم أو لا يحتوي على نص`
            );
          }
        }
      }
    }

    return { success: false, message: 'حدث Webhook غير مدعوم' };
  } catch (err) {
    console.error(
      `[${getCurrentTime()}] ❌ خطأ في معالجة حدث Webhook:`,
      err.message,
      err.stack
    );
    return { success: false, message: 'خطأ في معالجة حدث Webhook' };
  }
}

module.exports = {
  processMessage,
  handleWebhookEvent,
  transcribeAudio,
  generateImage,
};
