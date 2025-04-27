// /server/botEngine.js

const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const Bot = require('./models/Bot');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversationSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  userId: { type: String, required: true },
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Conversation = mongoose.model('Conversation', conversationSchema);

const Rule = require('./models/Rule');

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

    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    console.log('📜 Rules found:', rules);

    let systemPrompt = 'أنت بوت ذكي يساعد المستخدمين بناءً على القواعد التالية:\n';
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
        }
      });
    }
    console.log('📝 System prompt:', systemPrompt);

    let conversation = await Conversation.findOne({ botId, userId });
    if (!conversation) {
      console.log('📋 Creating new conversation for bot:', botId, 'user:', userId);
      conversation = await Conversation.create({ botId, userId, messages: [] });
    } else {
      console.log('📋 Found existing conversation:', conversation._id);
    }

    let userMessageContent = message;

    if (isVoice) {
      userMessageContent = await transcribeAudio(message);
      if (!userMessageContent) {
        throw new Error('Failed to transcribe audio: No text returned');
      }
      console.log('💬 Transcribed audio message:', userMessageContent);
    }

    // إضافة رسالة المستخدم مع الـ timestamp
    conversation.messages.push({ role: 'user', content: userMessageContent, timestamp: new Date() });
    await conversation.save();
    console.log('💬 User message added to conversation:', userMessageContent);

    // جلب وقت آخر رسالة من المستخدم
    const lastUserMessage = conversation.messages
      .filter(msg => msg.role === 'user')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    const lastMessageTimestamp = lastUserMessage ? new Date(lastUserMessage.timestamp) : new Date();

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    if (isImage) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this image:' },
          { type: 'image_url', image_url: { url: message } },
        ],
      });
      console.log('🖼️ Processing image message');
    }

    console.log('📡 Calling OpenAI API...');
    let reply = '';
    let matchedRuleId = null;

    // التحقق إذا كان السؤال يتعلق بمواعيد العمل
    if (message.includes('انتوا فاتحين') || message.includes('مواعيد العمل')) {
      // تحليل القواعد لاستخراج مواعيد العمل باستخدام OpenAI
      const timePrompt = `
        أنت بوت ذكي. القواعد التالية تحتوي على معلومات قد تتضمن مواعيد العمل:
        ${systemPrompt}
        السؤال: "${message}"
        حاول استخراج مواعيد العمل (مثل "من 9 الصبح لـ 5 المغرب" أو "من الساعة 8 للساعة 6") من القواعد.
        لو لقيت مواعيد عمل، رجعها في صيغة: "من HH:MM إلى HH:MM" (بتوقيت 24 ساعة).
        لو ما لقيتش مواعيد عمل، رجع: "لم أجد مواعيد عمل في القواعد."
      `;

      const timeResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: timePrompt }],
        max_tokens: 100,
      });

      let workingHoursText = timeResponse.choices[0].message.content;
      let workingHours = { start: '09:00', end: '17:00' }; // قيم افتراضية لو ما لقيناش مواعيد

      if (workingHoursText !== 'لم أجد مواعيد عمل في القواعد.') {
        // استخراج مواعيد العمل من النص (مثال: "من 09:00 إلى 17:00")
        const match = workingHoursText.match(/من (\d{2}:\d{2}) إلى (\d{2}:\d{2})/);
        if (match) {
          workingHours.start = match[1];
          workingHours.end = match[2];
        }

        // ابحث عن القاعدة اللي فيها مواعيد العمل عشان نزوّد usageCount
        const matchedRule = rules.find(rule => 
          (rule.type === 'general' || rule.type === 'global') && 
          rule.content.includes(workingHoursText)
        );
        if (matchedRule) {
          matchedRuleId = matchedRule._id;
        }
      } else {
        reply = 'لم أجد مواعيد عمل في القواعد. يمكنك إضافتها في القواعد الخاصة بي!';
      }

      // إذا لقينا مواعيد عمل، نحسب إذا البوت "فاتح" أو "مغلق"
      if (!reply) {
        const now = lastMessageTimestamp;
        const startTime = new Date(now.toDateString() + ' ' + workingHours.start);
        const endTime = new Date(now.toDateString() + ' ' + workingHours.end);
        const isOpen = now >= startTime && now <= endTime;

        reply = `مواعيد العمل من ${workingHours.start} إلى ${workingHours.end}. الوقت دلوقتي ${lastMessageTimestamp.toLocaleString('ar-EG')}. ${isOpen ? 'إحنا فاتحين دلوقتي!' : 'للأسف إحنا مغلقين دلوقتي.'}`;
      }
    } else {
      // إذا كان السؤال مش عن مواعيد العمل، نكمل معالجة الرسالة بشكل عادي
      // نبحث عن قاعدة مطابقة قبل استدعاء OpenAI
      for (const rule of rules) {
        if (rule.type === 'qa' && userMessageContent.toLowerCase().includes(rule.content.question.toLowerCase())) {
          matchedRuleId = rule._id;
          reply = rule.content.answer;
          break;
        } else if (rule.type === 'general' || rule.type === 'global') {
          if (userMessageContent.toLowerCase().includes(rule.content.toLowerCase())) {
            matchedRuleId = rule._id;
            reply = rule.content;
            break;
          }
        } else if (rule.type === 'products') {
          if (userMessageContent.toLowerCase().includes(rule.content.product.toLowerCase())) {
            matchedRuleId = rule._id;
            reply = `المنتج: ${rule.content.product}، السعر: ${rule.content.price} ${rule.content.currency}`;
            break;
          }
        }
      }

      // إذا ما لقيناش قاعدة مطابقة، نستدعي OpenAI
      if (!reply) {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 700,
        });
        reply = response.choices[0].message.content;
      }
    }

    // زيادة usageCount للقاعدة المستخدمة (إذا وجدت)
    if (matchedRuleId) {
      await Rule.updateOne({ _id: matchedRuleId }, { $inc: { usageCount: 1 } });
      console.log(`📈 Incremented usageCount for rule: ${matchedRuleId}`);
    }

    // استبدال القيم الديناميكية في الرد
    if (reply.includes('${lastMessageTimestamp.toLocaleString(\'ar-EG\')}')) {
      reply = reply.replace('${lastMessageTimestamp.toLocaleString(\'ar-EG\')}', lastMessageTimestamp.toLocaleString('ar-EG'));
    }
    if (reply.includes('${lastMessageTimestamp.toISOString()}')) {
      reply = reply.replace('${lastMessageTimestamp.toISOString()}', lastMessageTimestamp.toISOString());
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
