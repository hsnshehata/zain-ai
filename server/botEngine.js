const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const Bot = require('./models/Bot'); // استيراد موديل Bot

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

    // جلب مواعيد العمل بتاعت البوت
    const bot = await Bot.findById(botId);
    if (!bot) throw new Error('Bot not found');

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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 700,
    });

    let reply = response.choices[0].message.content;
    console.log('✅ OpenAI reply:', reply);

    // استبدال القيم الديناميكية في الرد
    if (reply.includes('${lastMessageTimestamp.toLocaleString(\'ar-EG\')}')) {
      reply = reply.replace('${lastMessageTimestamp.toLocaleString(\'ar-EG\')}', lastMessageTimestamp.toLocaleString('ar-EG'));
    }
    if (reply.includes('${lastMessageTimestamp.toISOString()}')) {
      reply = reply.replace('${lastMessageTimestamp.toISOString()}', lastMessageTimestamp.toISOString());
    }
    if (reply.includes('${workingHours.start}')) {
      reply = reply.replace('${workingHours.start}', bot.workingHours.start);
    }
    if (reply.includes('${workingHours.end}')) {
      reply = reply.replace('${workingHours.end}', bot.workingHours.end);
    }
    if (reply.includes('${isOpen ? \'إحنا فاتحين دلوقتي!\' : \'للأسف إحنا مغلقين دلوقتي.\'}')) {
      const now = lastMessageTimestamp;
      const startTime = new Date(now.toDateString() + ' ' + bot.workingHours.start);
      const endTime = new Date(now.toDateString() + ' ' + bot.workingHours.end);
      const isOpen = now >= startTime && now <= endTime;
      reply = reply.replace('${isOpen ? \'إحنا فاتحين دلوقتي!\' : \'للأسف إحنا مغلقين دلوقتي.\'}', isOpen ? 'إحنا فاتحين دلوقتي!' : 'للأسف إحنا مغلقين دلوقتي.');
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
