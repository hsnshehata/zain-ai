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
let sendFacebookMessage;
try {
  sendFacebookMessage = require('./controllers/facebookController').sendMessage;
  console.log(`[${new Date().toISOString()}] ✅ Successfully imported sendFacebookMessage from facebookController`);
} catch (err) {
  console.error(`[${new Date().toISOString()}] ❌ Failed to import sendFacebookMessage:`, err.message);
  sendFacebookMessage = null;
}
const { sendMessage: sendInstagramMessage } = require('./controllers/instagramController');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// دالة لجلب الوقت الحالي
function getCurrentTime() {
  return new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
}

// دالة لجلب الـ timestamp
const getTimestamp = () => new Date().toISOString();

async function transcribeAudio(audioUrl) {
  const body = new FormData();
  body.append('file', audioUrl);
  body.append('language', 'arabic');
  body.append('response_format', 'json');
  try {
    console.log(
      `[${getTimestamp()}] LemonFox API Key: ` +
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
    console.log(`[${getTimestamp()}] ✅ Audio transcribed with LemonFox:`, response.data.text);
    return response.data.text;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error transcribing audio with LemonFox:`, err.message, err.stack);
    throw new Error(`Failed to transcribe audio: ${err.message}`);
  }
}

async function processMessage(botId, userId, message, isImage = false, isVoice = false, messageId = null, channel = 'web') {
  try {
    console.log(`[${getTimestamp()}] 📢 Raw userId received: ${userId} (type: ${typeof userId})`);

    // تحقق من userId
    let finalUserId = userId;
    if (!userId || userId === 'anonymous' || userId === null || userId === undefined) {
      finalUserId = `web_${uuidv4()}`;
      console.log(`[${getTimestamp()}] 📋 Generated new userId for channel ${channel} due to missing or invalid userId: ${finalUserId}`);
    } else {
      console.log(`[${getTimestamp()}] 📋 Using provided userId: ${finalUserId}`);
    }

    console.log(`[${getTimestamp()}] 🤖 Processing message for bot: ${botId}, user: ${finalUserId}, message: ${message}, channel: ${channel}`);

    // تحديد القناة
    const finalChannel = channel || 'web';

    let conversation = await Conversation.findOne({ botId, userId: finalUserId, channel: finalChannel });
    if (!conversation) {
      console.log(`[${getTimestamp()}] 📋 Creating new conversation for bot: ${botId}, user: ${finalUserId}, channel: ${finalChannel}`);
      conversation = await Conversation.create({ 
        botId, 
        userId: finalUserId, 
        channel: finalChannel, 
        messages: [],
        username: finalChannel === 'web' ? `زائر ويب ${finalUserId.replace('web_', '').slice(0, 8)}` : undefined 
      });
    } else {
      console.log(`[${getTimestamp()}] 📋 Found existing conversation for user: ${finalUserId}, conversationId: ${conversation._id}`);
      if (finalChannel === 'web' && !conversation.username) {
        conversation.username = `زائر ويب ${finalUserId.replace('web_', '').slice(0, 8)}`;
        await conversation.save();
      }
    }

    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    console.log(`[${getTimestamp()}] 📜 Rules found: ${rules.length}`);

    // بناء الـ systemPrompt مع إضافة الوقت الحالي
    let systemPrompt = `أنت بوت ذكي يساعد المستخدمين بناءً على القواعد التالية. الوقت الحالي هو: ${getCurrentTime()}.\n`;
    if (rules.length === 0) {
      systemPrompt += 'لا توجد قواعد محددة، قم بالرد بشكل عام ومفيد.\n';
    } else {
      rules.forEach((rule) => {
        if (rule.type === 'global' || rule.type === 'general') {
          systemPrompt += `${rule.content}\n`;
        } else if (rule.type === 'products') {
          systemPrompt += `المنتج: ${rule.content.product}، السعر: ${rule.content.price} ${rule.content.currency}\n`;
        } else if (rule.type === 'qa') {
          systemPrompt += `السؤال: ${rule.content.question}، الإجابة: ${rule.content.answer}\n`;
        } else if (rule.type === 'channels') {
          systemPrompt += `قناة التواصل: ${rule.content.platform}، الوصف: ${rule.content.description}، الرابط/الرقم: ${rule.content.value}\n`;
        }
      });
    }
    console.log(`[${getTimestamp()}] 📝 System prompt:`, systemPrompt);

    let userMessageContent = message;

    if (isVoice) {
      try {
        userMessageContent = await transcribeAudio(message);
        if (!userMessageContent) {
          throw new Error('Failed to transcribe audio: No text returned');
        }
        console.log(`[${getTimestamp()}] 💬 Transcribed audio message: ${userMessageContent}`);
      } catch (err) {
        console.error(`[${getTimestamp()}] ❌ Failed to transcribe audio: ${err.message}`);
        userMessageContent = 'عذرًا، لم أتمكن من معالجة الرسالة الصوتية.';
      }
    }

    // إضافة رسالة المستخدم للمحادثة
    conversation.messages.push({ 
      role: 'user', 
      content: userMessageContent, 
      timestamp: new Date(),
      messageId: messageId || `msg_${uuidv4()}` 
    });

    await conversation.save();
    console.log(`[${getTimestamp()}] 💬 User message added to conversation: ${userMessageContent}`);

    // جلب السياق (آخر 20 رسالة قبل الرسالة الحالية)
    const contextMessages = conversation.messages.slice(-21, -1);
    const context = contextMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    console.log(`[${getTimestamp()}] 🧠 Conversation context: ${context.length} messages`);

    let reply = '';

    // البحث عن قاعدة مطابقة قبل استدعاء OpenAI
    for (const rule of rules) {
      if (rule.type === 'qa' && userMessageContent.toLowerCase().includes(rule.content.question.toLowerCase())) {
        reply = rule.content.answer;
        break;
      } else if (rule.type === 'general' || rule.type === 'global') {
        if (userMessageContent.toLowerCase().includes(rule.content.toLowerCase())) {
          reply = rule.content;
          break;
        }
      } else if (rule.type === 'products') {
        if (userMessageContent.toLowerCase().includes(rule.content.product.toLowerCase())) {
          reply = `المنتج: ${rule.content.product}، السعر: ${rule.content.price} ${rule.content.currency}`;
          break;
        }
      } else if (rule.type === 'channels') {
        if (userMessageContent.toLowerCase().includes(rule.content.platform.toLowerCase())) {
          reply = `قناة التواصل: ${rule.content.platform}\nالوصف: ${rule.content.description}\nالرابط/الرقم: ${rule.content.value}`;
          break;
        }
      }
    }

    // إذا لم يتم العثور على قاعدة، استدعاء OpenAI
    if (!reply) {
      try {
        if (isImage) {
          const response = await openai.responses.create({
            model: 'gpt-4.1-mini-2025-04-14',
            input: [
              { role: 'system', content: systemPrompt },
              ...context,
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: 'رد على حسب محتوى الصورة' },
                  { type: 'input_image', image_url: message },
                ],
              },
            ],
            max_output_tokens: 5000,
          });
          reply = response.output_text || 'عذرًا، لم أتمكن من تحليل الصورة.';
          console.log(`[${getTimestamp()}] 🖼️ Image processed: ${reply}`);
        } else {
          const messages = [
            { role: 'system', content: systemPrompt },
            ...context,
            { role: 'user', content: userMessageContent },
          ];
          const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini-2025-04-14',
            messages,
            max_tokens: 5000,
          });
          reply = response.choices[0].message.content;
        }
      } catch (err) {
        console.error(`[${getTimestamp()}] ❌ Error calling OpenAI: ${err.message}`);
        reply = 'عذرًا، حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى لاحقًا.';
      }
    }

    // حفظ رد البوت
    const responseMessageId = `response_${messageId || uuidv4()}`;
    conversation.messages.push({ 
      role: 'assistant', 
      content: reply, 
      timestamp: new Date(),
      messageId: responseMessageId 
    });

    await conversation.save();
    console.log(`[${getTimestamp()}] 💬 Assistant reply added to conversation: ${reply}`);

    // معالجة الرسالة التلقائية لفيسبوك أو إنستجرام
    if (finalChannel === 'facebook' || finalChannel === 'instagram') {
      const bot = await Bot.findById(botId);
      if (!bot) {
        console.log(`[${getTimestamp()}] ⚠️ البوت غير موجود | Bot ID: ${botId}`);
        return reply;
      }

      let autoMessageEnabled, autoMessageText, autoMessageImage, autoMessageDelay, sendMessageFn, recipientId, apiKey;

      if (finalChannel === 'facebook') {
        autoMessageEnabled = bot.facebookAutoMessageEnabled;
        autoMessageText = bot.facebookAutoMessageText;
        autoMessageImage = bot.facebookAutoMessageImage;
        autoMessageDelay = bot.facebookAutoMessageDelay || 600000;
        sendMessageFn = sendFacebookMessage;
        recipientId = finalUserId.replace('facebook_', '');
        apiKey = bot.facebookApiKey;
        console.log(`[${getTimestamp()}] 📋 Facebook auto message settings | Bot ID: ${botId} | Enabled: ${autoMessageEnabled} | Text: ${autoMessageText} | Delay: ${autoMessageDelay}ms | Image: ${autoMessageImage || 'None'}`);
      } else if (finalChannel === 'instagram') {
        autoMessageEnabled = bot.instagramAutoMessageEnabled;
        autoMessageText = bot.instagramAutoMessageText;
        autoMessageImage = bot.instagramAutoMessageImage;
        autoMessageDelay = bot.instagramAutoMessageDelay || 600000;
        sendMessageFn = sendInstagramMessage;
        recipientId = finalUserId.replace('instagram_', '');
        apiKey = bot.instagramApiKey;
        console.log(`[${getTimestamp()}] 📋 Instagram auto message settings | Bot ID: ${botId} | Enabled: ${autoMessageEnabled} | Text: ${autoMessageText} | Delay: ${autoMessageDelay}ms | Image: ${autoMessageImage || 'None'}`);
      }

      if (!autoMessageEnabled) {
        console.log(`[${getTimestamp()}] ⚠️ Auto message disabled for ${finalChannel} | Bot ID: ${botId} | User ID: ${finalUserId}`);
      }
      if (!autoMessageText) {
        console.log(`[${getTimestamp()}] ⚠️ Auto message text is empty for ${finalChannel} | Bot ID: ${botId} | User ID: ${finalUserId}`);
      }
      if (!autoMessageDelay) {
        console.log(`[${getTimestamp()}] ⚠️ Auto message delay is not set for ${finalChannel} | Bot ID: ${botId} | User ID: ${finalUserId}`);
      }
      if (typeof sendMessageFn !== 'function') {
        console.error(`[${getTimestamp()}] ❌ sendMessageFn is not a function for ${finalChannel} | Bot ID: ${botId} | User ID: ${finalUserId} | Type: ${typeof sendMessageFn}`);
        console.error(`[${getTimestamp()}] 🔍 Check if ${finalChannel === 'facebook' ? 'facebookController.js' : 'instagramController.js'} is correctly exporting sendMessage`);
      }

      if (autoMessageEnabled && autoMessageText && autoMessageDelay && typeof sendMessageFn === 'function') {
        console.log(`[${getTimestamp()}] ✅ Auto message settings valid for ${finalChannel} | Bot ID: ${botId} | User ID: ${finalUserId}`);
        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        if (!conversation.lastAutoMessageSent || conversation.lastAutoMessageSent < fortyEightHoursAgo) {
          console.log(`[${getTimestamp()}] ⏰ Scheduling auto message for user ${finalUserId} to be sent after ${autoMessageDelay}ms`);

          setTimeout(async () => {
            try {
              const updatedConversation = await Conversation.findOne({ botId, userId: finalUserId, channel: finalChannel });
              if (!updatedConversation) {
                console.log(`[${getTimestamp()}] ⚠️ المحادثة غير موجودة عند إرسال الرسالة التلقائية | User ID: ${finalUserId}`);
                return;
              }

              if (!updatedConversation.lastAutoMessageSent || updatedConversation.lastAutoMessageSent < fortyEightHoursAgo) {
                console.log(`[${getTimestamp()}] 📤 Attempting to send auto message to ${finalUserId} after delay`);
                await sendMessageFn(recipientId, autoMessageText, apiKey, autoMessageImage);

                updatedConversation.lastAutoMessageSent = new Date();
                await updatedConversation.save();
                console.log(`[${getTimestamp()}] ✅ Auto message sent to ${finalUserId} and lastAutoMessageSent updated`);
              } else {
                console.log(`[${getTimestamp()}] ⚠️ Auto message skipped for ${finalUserId} (sent within last 48 hours)`);
              }
            } catch (err) {
              console.error(`[${getTimestamp()}] ❌ Error sending auto message to ${finalUserId}:`, err.message);
            }
          }, autoMessageDelay);
        } else {
          console.log(`[${getTimestamp()}] ⚠️ Auto message skipped for ${finalUserId} (sent within last 48 hours)`);
        }
      } else {
        console.log(`[${getTimestamp()}] ⚠️ Auto message not sent for ${finalChannel} due to invalid configuration | Bot ID: ${botId} | User ID: ${finalUserId}`);
      }
    }

    return reply;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error processing message:`, err.message, err.stack);
    return 'عذرًا، حدث خطأ أثناء معالجة طلبك.';
  }
}

async function processFeedback(botId, userId, messageId, feedback) {
  try {
    console.log(`[${getTimestamp()}] 📊 Processing feedback for bot: ${botId}, user: ${userId}, messageId: ${messageId}, feedback: ${feedback}`);

    let type = '';
    if (feedback === 'Good response') {
      type = 'like';
    } else if (feedback === 'Bad response') {
      type = 'dislike';
    } else {
      console.log(`[${getTimestamp()}] ⚠️ Unknown feedback type: ${feedback}, skipping...`);
      return;
    }

    const conversation = await Conversation.findOne({ botId, userId });
    let messageContent = 'غير معروف';
    let userMessage = 'غير معروف';
    let feedbackTimestamp = new Date();

    if (conversation) {
      const botMessages = conversation.messages
        .filter(msg => msg.role === 'assistant' && new Date(msg.timestamp) <= feedbackTimestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const botMessage = botMessages.length > 0 ? botMessages[0] : null;

      if (botMessage) {
        messageContent = botMessage.content;
        const botMessageIndex = conversation.messages.findIndex(msg => msg === botMessage);
        let userMessageIndex = botMessageIndex - 1;
        while (userMessageIndex >= 0 && conversation.messages[userMessageIndex].role !== 'user') {
          userMessageIndex--;
        }
        if (userMessageIndex >= 0) {
          userMessage = conversation.messages[userMessageIndex].content;
        } else {
          console.log(`[${getTimestamp()}] ⚠️ No user message found before bot message for userId: ${userId}`);
        }
      } else {
        console.log(`[${getTimestamp()}] ⚠️ No bot message found for userId: ${userId} before timestamp: ${feedbackTimestamp}`);
      }
    } else {
      console.log(`[${getTimestamp()}] ⚠️ No conversation found for bot: ${botId}, user: ${userId}`);
    }

    const feedbackEntry = await Feedback.findOneAndUpdate(
      { userId, messageId },
      {
        botId,
        userId,
        messageId,
        type,
        messageContent,
        userMessage,
        timestamp: feedbackTimestamp,
        isVisible: true
      },
      { upsert: true, new: true }
    );

    console.log(`[${getTimestamp()}] ✅ Feedback saved: ${type} for message ID: ${messageId} with content: ${messageContent}, user message: ${userMessage}`);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error processing feedback:`, err.message, err.stack);
  }
}

module.exports = { processMessage, processFeedback };
