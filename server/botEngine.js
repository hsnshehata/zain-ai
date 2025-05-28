// server/botEngine.js
const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid'); // إضافة مكتبة uuid
const Bot = require('./models/Bot');
const Rule = require('./models/Rule');
const Conversation = require('./models/Conversation');
const Feedback = require('./models/Feedback');

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
    console.log('✅ Audio transcribed with LemonFox:', response.data.text);
    return response.data.text;
  } catch (err) {
    console.error('❌ Error transcribing audio with LemonFox:', err.message, err.stack);
    throw new Error(`Failed to transcribe audio: ${err.message}`);
  }
}

async function processMessage(botId, userId, message, isImage = false, isVoice = false, messageId = null, channel = 'unknown') {
  try {
    // تحقق من userId وتوليد واحد جديد لو مش صالح (للويب بس)
    let finalUserId = userId;
    if (!userId || userId === 'anonymous' || !userId.startsWith('web_')) {
      if (channel === 'web') {
        finalUserId = `web_${uuidv4()}`;
        console.log(`📋 Generated new userId for web user: ${finalUserId}`);
      } else {
        finalUserId = userId || `unknown_${Date.now()}`;
      }
    }

    console.log('🤖 Processing message for bot:', botId, 'user:', finalUserId, 'message:', message, 'channel:', channel);

    // تحديد القناة إذا كانت غير محددة
    const finalChannel = channel === 'unknown' ? 'web' : channel;

    let conversation = await Conversation.findOne({ botId, userId: finalUserId, channel: finalChannel });
    if (!conversation) {
      console.log('📋 Creating new conversation for bot:', botId, 'user:', finalUserId, 'channel:', finalChannel);
      conversation = await Conversation.create({ 
        botId, 
        userId: finalUserId, 
        channel: finalChannel, 
        messages: [],
        username: finalChannel === 'web' ? `زائر ويب ${finalUserId.replace('web_', '').slice(0, 8)}` : undefined 
      });
    } else {
      console.log('📋 Found existing conversation:', conversation._id);
    }

    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    console.log('📜 Rules found:', rules);

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
    console.log('📝 System prompt:', systemPrompt);

    let userMessageContent = message;

    if (isVoice) {
      userMessageContent = await transcribeAudio(message);
      if (!userMessageContent) {
        throw new Error('Failed to transcribe audio: No text returned');
      }
      console.log('💬 Transcribed audio message:', userMessageContent);
    }

    // إضافة رسالة المستخدم للمحادثة
    conversation.messages.push({ 
      role: 'user', 
      content: userMessageContent, 
      timestamp: new Date(),
      messageId: messageId || `msg_${Date.now()}` 
    });

    await conversation.save();
    console.log('💬 User message added to conversation:', userMessageContent);

    // جلب السياق (آخر 20 رسالة قبل الرسالة الحالية)
    const contextMessages = conversation.messages.slice(-21, -1); // نجيب آخر 20 رسالة قبل الرسالة الحالية
    const context = contextMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    console.log('🧠 Conversation context:', context);

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
      if (isImage) {
        // معالجة الصور باستخدام responses.create مع input
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
        console.log('🖼️ Image processed:', reply);
      } else {
        // معالجة النصوص باستخدام chat.completions.create
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
    }

    // حفظ رد البوت
    const responseMessageId = `response_${messageId || Date.now()}`;
    conversation.messages.push({ 
      role: 'assistant', 
      content: reply, 
      timestamp: new Date(),
      messageId: responseMessageId 
    });

    await conversation.save();
    console.log('💬 Assistant reply added to conversation:', reply);

    return reply;
  } catch (err) {
    console.error('❌ Error processing message:', err.message, err.stack);
    return 'عذرًا، حدث خطأ أثناء معالجة طلبك.';
  }
}

async function processFeedback(botId, userId, messageId, feedback) {
  try {
    console.log(`📊 Processing feedback for bot: ${botId}, user: ${userId}, messageId: ${messageId}, feedback: ${feedback}`);

    // تحويل feedback إلى type
    let type = '';
    if (feedback === 'Good response') {
      type = 'like';
    } else if (feedback === 'Bad response') {
      type = 'dislike';
    } else {
      console.log(`⚠️ Unknown feedback type: ${feedback}, skipping...`);
      return;
    }

    // جلب المحادثة
    const conversation = await Conversation.findOne({ botId, userId });
    let messageContent = 'غير معروف';
    let userMessage = 'غير معروف';
    let feedbackTimestamp = new Date();

    if (conversation) {
      // نبحث عن آخر رد بوت قبل تاريخ التقييم
      const botMessages = conversation.messages
        .filter(msg => msg.role === 'assistant' && new Date(msg.timestamp) <= feedbackTimestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const botMessage = botMessages.length > 0 ? botMessages[0] : null;

      if (botMessage) {
        messageContent = botMessage.content;
        // نبحث عن رسالة المستخدم اللي قبل رد البوت مباشرة
        const botMessageIndex = conversation.messages.findIndex(msg => msg === botMessage);
        let userMessageIndex = botMessageIndex - 1;
        while (userMessageIndex >= 0 && conversation.messages[userMessageIndex].role !== 'user') {
          userMessageIndex--;
        }
        if (userMessageIndex >= 0) {
          userMessage = conversation.messages[userMessageIndex].content;
        } else {
          console.log(`⚠️ No user message found before bot message for userId: ${userId}`);
        }
      } else {
        console.log(`⚠️ No bot message found for userId: ${userId} before timestamp: ${feedbackTimestamp}`);
      }
    } else {
      console.log(`⚠️ No conversation found for bot: ${botId}, user: ${userId}`);
    }

    // حفظ التقييم باستخدام الموديل الجديد
    const feedbackEntry = await Feedback.findOneAndUpdate(
      { userId, messageId },
      {
        botId,
        userId,
        messageId,
        type,
        messageContent,
        userMessage, // حفظ رسالة المستخدم
        timestamp: feedbackTimestamp,
        isVisible: true
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Feedback saved: ${type} for message ID: ${messageId} with content: ${messageContent}, user message: ${userMessage}`);
  } catch (err) {
    console.error('❌ Error processing feedback:', err.message, err.stack);
  }
}

module.exports = { processMessage, processFeedback };
