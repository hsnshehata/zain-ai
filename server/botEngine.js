const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const Bot = require('../models/Bot');
const Rule = require('../models/Rule');
const Conversation = require('../models/Conversation');
const Feedback = require('../models/Feedback');

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

async function processMessage(botId, userId, message, isImage = false, isVoice = false, messageId = null) {
  try {
    console.log('🤖 Processing message for bot:', botId, 'user:', userId, 'message:', message);

    let conversation = await Conversation.findOne({ botId, userId });
    if (!conversation) {
      console.log('📋 Creating new conversation for bot:', botId, 'user:', userId);
      conversation = await Conversation.create({ botId, userId, messages: [] });
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

    // التأكد إن الـ messages ما يزيدش عن 20 رسالة
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }

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

    // التأكد إن الـ messages ما يزيدش عن 20 رسالة بعد إضافة رد البوت
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }

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

    // جلب المحادثة
    const conversation = await Conversation.findOne({ botId, userId });
    let messageContent = 'غير معروف';

    if (conversation) {
      // ابحث عن رد البوت بناءً على response_${messageId}
      const botMessage = conversation.messages.find(msg => msg.messageId === `response_${messageId}` && msg.role === 'assistant');
      if (botMessage) {
        messageContent = botMessage.content;
      } else {
        // لو مش لاقي رد البوت، جرب رسالة المستخدم
        const userMessage = conversation.messages.find(msg => msg.messageId === messageId && msg.role === 'user');
        if (userMessage) {
          messageContent = userMessage.content;
        }
      }
    }

    // حفظ الـ feedback
    const feedbackEntry = new Feedback({
      botId,
      userId,
      messageId,
      feedback: feedback === 'Good response' ? 'positive' : 'negative',
      messageContent,
      timestamp: new Date(),
      isVisible: true
    });

    await feedbackEntry.save();
    console.log(`✅ Feedback saved: ${feedback} for message ID: ${messageId} with content: ${messageContent}`);
  } catch (err) {
    console.error('❌ Error processing feedback:', err.message, err.stack);
  }
}

module.exports = { processMessage, processFeedback };
