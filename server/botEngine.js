const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const Bot = require('./models/Bot');
const Rule = require('./models/Rule');
const Conversation = require('./models/Conversation');

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

async function processMessage(botId, userId, message, isImage = false, isVoice = false) {
  try {
    console.log('🤖 Processing message for bot:', botId, 'user:', userId, 'message:', message);

    let conversation = await Conversation.findOne({ botId, userId });
    if (!conversation) {
      console.log('📋 Creating new conversation for bot:', botId, 'user:', userId);
      conversation = await Conversation.create({ botId, userId, messages: [] });
    } else {
      console.log('📋 Found existing conversation:', conversation._id);
    }

    // فحص تكرار الرسالة
    const messageKey = `${message}-${Date.now()}`;
    if (conversation.messages.some(msg => 
      msg.content === message && 
      Math.abs(new Date(msg.timestamp) - Date.now()) < 1000
    )) {
      console.log(`⚠️ Duplicate message detected in conversation for ${userId}, skipping...`);
      return 'تم معالجة هذه الرسالة من قبل';
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

    conversation.messages.push({ role: 'user', content: userMessageContent, timestamp: new Date() });
    await conversation.save();
    console.log('💬 User message added to conversation:', userMessageContent);

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
            ...conversation.messages.map((msg) => ({ role: msg.role, content: msg.content })),
            {
              role: 'user',
              content: [
                { type: 'input_text', text: 'اطلب معلومات عن المنتج الموجود في الصورة' },
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
          ...conversation.messages.map((msg) => ({ role: msg.role, content: msg.content })),
        ];
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-mini-2025-04-14',
          messages,
          max_tokens: 5000,
        });
        reply = response.choices[0].message.content;
      }
    }

    conversation.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
    await conversation.save();
    console.log('💬 Assistant reply added to conversation:', reply);

    return reply;
  } catch (err) {
    console.error('❌ Error processing message:', err.message, err.stack);
    return 'عذرًا، حدث خطأ أثناء معالجة طلبك.';
  }
}

module.exports = { processMessage };
