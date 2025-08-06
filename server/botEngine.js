const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const Bot = require('./models/Bot');
const Rule = require('./models/Rule');
const Conversation = require('./models/Conversation');
const Feedback = require('./models/Feedback');
const Store = require('./models/Store');
const Product = require('./models/Product');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// دالة لجلب الوقت الحالي
function getCurrentTime() {
  return new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
}

// دالة لتحميل الصورة وتحويلها إلى base64
async function downloadImageToBase64(imageUrl) {
  try {
    console.log('📥 جاري تحميل الصورة من:', imageUrl);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Authorization: `Bearer ${process.env.FACEBOOK_ACCESS_TOKEN}`, // إضافة توكن فيسبوك
      },
    });
    const imageBuffer = Buffer.from(response.data);
    const base64Image = imageBuffer.toString('base64');
    console.log('✅ تم تحميل الصورة وتحويلها إلى base64');
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (err) {
    console.error('❌ خطأ أثناء تحميل الصورة:', err.message);
    throw new Error('عذرًا، لم أتمكن من تحميل الصورة. حاول مرة أخرى أو أرسل صورة أخرى.');
  }
}

async function transcribeAudio(audioUrl) {
  try {
    console.log('🎙️ Starting audio transcription with LemonFox, audioUrl:', audioUrl);
    if (!audioUrl || !audioUrl.startsWith('http')) {
      console.error('❌ Invalid or missing audioUrl:', audioUrl);
      throw new Error('Invalid audio URL');
    }

    console.log('📥 Fetching audio file from:', audioUrl);
    const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(audioResponse.data);

    const body = new FormData();
    body.append('file', audioBuffer, { filename: 'audio.mp4', contentType: 'audio/mp4' });
    body.append('language', 'arabic');
    body.append('response_format', 'json');

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
    throw new Error('عذرًا، لم أتمكن من تحليل الصوت. ممكن تبعتلي نص بدل الصوت؟');
  }
}

async function processMessage(botId, userId, message, isImage = false, isVoice = false, messageId = null, channel = 'web', mediaUrl = null) {
  try {
    console.log(`📢 Raw userId received: ${userId} (type: ${typeof userId})`);

    let finalUserId = userId;
    let finalUsername = undefined;

    if (!userId || userId === 'anonymous' || userId === null || userId === undefined) {
      if (channel === 'whatsapp' && userId && userId.includes('@c.us')) {
        finalUserId = userId;
        finalUsername = userId.split('@c.us')[0];
        console.log(`📋 Using WhatsApp userId: ${finalUserId}, username: ${finalUsername}`);
      } else {
        finalUserId = `web_${uuidv4()}`;
        console.log(`📋 Generated new userId for channel ${channel}: ${finalUserId}`);
      }
    } else {
      if (channel === 'whatsapp' && userId.includes('@c.us')) {
        finalUserId = userId;
        finalUsername = userId.split('@c.us')[0];
        console.log(`📋 Using WhatsApp userId: ${finalUserId}, username: ${finalUsername}`);
      } else {
        console.log(`📋 Using provided userId: ${finalUserId}`);
      }
    }

    let finalChannel = channel || 'web';
    if (finalUserId.includes('@c.us')) {
      finalChannel = 'whatsapp';
      console.log(`📋 Overriding channel to 'whatsapp' because userId contains @c.us`);
    }
    console.log('🤖 Processing message for bot:', botId, 'user:', finalUserId, 'message:', message, 'channel:', finalChannel, 'isImage:', isImage, 'isVoice:', isVoice, 'mediaUrl:', mediaUrl);

    if (!botId || !finalUserId || (!message && !isImage && !isVoice && !mediaUrl)) {
      console.log(`❌ Missing required fields: botId=${botId}, userId=${finalUserId}, message=${message}, mediaUrl=${mediaUrl}`);
      return 'عذرًا، حدث خطأ في معالجة الطلب. حاول مرة أخرى.';
    }

    let conversation = await Conversation.findOne({ botId, userId: finalUserId, channel: finalChannel });
    if (!conversation) {
      console.log('📋 Creating new conversation for bot:', botId, 'user:', finalUserId, 'channel:', finalChannel);
      conversation = await Conversation.create({ 
        botId, 
        userId: finalUserId, 
        channel: finalChannel, 
        messages: [],
        username: finalUsername || (finalChannel === 'web' ? `زائر ويب ${finalUserId.replace('web_', '').slice(0, 8)}` : undefined) 
      });
    } else {
      console.log('📋 Found existing conversation for user:', finalUserId, 'conversationId:', conversation._id);
      if (finalChannel === 'web' && !conversation.username) {
        conversation.username = `زائر ويب ${finalUserId.replace('web_', '').slice(0, 8)}`;
        await conversation.save();
      } else if (finalChannel === 'whatsapp' && finalUsername && conversation.username !== finalUsername) {
        conversation.username = finalUsername;
        await conversation.save();
      }
    }

    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    console.log('📜 Rules found:', rules.length);

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

    // إضافة بيانات المتجر إذا كان البوت مرتبط بمتجر
    const bot = await Bot.findById(botId);
    if (bot && bot.storeId) {
      const store = await Store.findById(bot.storeId);
      if (store) {
        systemPrompt += `\nبيانات المتجر: الاسم: ${store.storeName}، الرابط: zainbot.com/${store.storeLink}.\n`;
        const products = await Product.find({ storeId: store._id });
        if (products.length > 0) {
          systemPrompt += 'المنتجات المتاحة:\n';
          products.forEach((product) => {
            systemPrompt += `المنتج: ${product.productName}، السعر: ${product.price} ${product.currency}، الوصف: ${product.description || 'غير متوفر'}، الصورة: ${product.imageUrl || 'غير متوفرة'}، المخزون: ${product.stock}.\n`;
          });
        } else {
          systemPrompt += 'لا توجد منتجات متاحة حاليًا في المتجر.\n';
        }
      }
    }

    console.log('📝 System prompt:', systemPrompt);

    let userMessageContent = message;

    if (isVoice) {
      try {
        if (mediaUrl && mediaUrl.startsWith('http')) {
          console.log('🎙️ Voice message with mediaUrl, transcribing:', mediaUrl);
          userMessageContent = await transcribeAudio(mediaUrl);
          console.log('💬 Transcribed audio message:', userMessageContent);
        } else if (message && message.startsWith('http')) {
          console.log('🎙️ Voice message with URL in message, transcribing:', message);
          userMessageContent = await transcribeAudio(message);
          console.log('💬 Transcribed audio message:', userMessageContent);
        } else if (message && !message.startsWith('http')) {
          userMessageContent = message;
          console.log('💬 Using pre-transcribed audio message from WhatsApp:', userMessageContent);
        } else {
          console.log('⚠️ No valid message or mediaUrl for voice');
          return 'عذرًا، لم أتمكن من تحليل الصوت. ممكن تبعتلي نص بدل الصوت؟';
        }
      } catch (err) {
        console.error('❌ Failed to transcribe audio:', err.message);
        return err.message;
      }
    } else if (isImage) {
      userMessageContent = message || '[صورة]';
      console.log('🖼️ Image message, content:', userMessageContent);
    }

    conversation.messages.push({ 
      role: 'user', 
      content: userMessageContent, 
      timestamp: new Date(),
      messageId: messageId || `msg_${uuidv4()}` 
    });

    await conversation.save();
    console.log('💬 User message added to conversation:', userMessageContent);

    const contextMessages = conversation.messages.slice(-21, -1);
    const context = contextMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    console.log('🧠 Conversation context:', context.length, 'messages');

    let reply = '';

    if (userMessageContent && !isImage && !isVoice) {
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
        } else if (rule.type === 'store') {
          const productName = rule.content.productName.toLowerCase();
          if (userMessageContent.toLowerCase().includes(productName)) {
            reply = `المنتج: ${rule.content.productName}، السعر: ${rule.content.price} ${rule.content.currency}، الوصف: ${rule.content.description || 'غير متوفر'}، الصورة: ${rule.content.imageUrl || 'غير متوفرة'}، المخزون: ${rule.content.stock}.`;
            break;
          }
        }
      }
    }

    if (!reply) {
      if (isImage) {
        if (!mediaUrl || !mediaUrl.startsWith('http')) {
          console.error('❌ Invalid or missing mediaUrl for image:', mediaUrl);
          return 'عذرًا، لم أتمكن من تحليل الصورة بسبب رابط غير صالح.';
        }
        console.log('🖼️ Processing image with mediaUrl:', mediaUrl);
        let imageDataUrl;

        try {
          // تحميل الصورة وتحويلها إلى base64
          imageDataUrl = await downloadImageToBase64(mediaUrl);
        } catch (err) {
          console.error('❌ Failed to download image:', err.message);
          return err.message;
        }

        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4.1-nano-2025-04-14',
            messages: [
              { role: 'system', content: systemPrompt },
              ...context,
              {
                role: 'user',
                content: [
                  { type: 'text', text: userMessageContent || 'أوصف محتوى الصورة باختصار' },
                  { type: 'image_url', image_url: { url: imageDataUrl } },
                ],
              },
            ],
            max_tokens: 1000,
          });
          reply = response.choices[0].message.content || 'عذرًا، لم أتمكن من تحليل الصورة.';
          console.log('🖼️ Image processed:', reply);
        } catch (err) {
          console.error('❌ Error processing image with OpenAI:', err.message);
          return 'عذرًا، لم أتمكن من تحليل الصورة. حاول مرة أخرى أو أرسل صورة أخرى.';
        }
      } else {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...context,
          { role: 'user', content: userMessageContent },
        ];
        console.log('📤 Sending to OpenAI for processing:', userMessageContent);
        const response = await openai.chat.completions.create({
          model: 'gpt-o4-mini-2025-04-16',
          messages,
          max_tokens: 5000,
        });
        reply = response.choices[0].message.content;
        console.log('💬 Assistant reply:', reply);
      }
    }

    const responseMessageId = `response_${messageId || uuidv4()}`;
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
    return 'عذرًا، حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى.';
  }
}

async function processFeedback(botId, userId, messageId, feedback) {
  try {
    console.log(`📊 Processing feedback for bot: ${botId}, user: ${userId}, messageId: ${messageId}, feedback: ${feedback}`);

    let type = '';
    if (feedback === 'Good response') {
      type = 'like';
    } else if (feedback === 'Bad response') {
      type = 'dislike';
    } else {
      console.log(`⚠️ Unknown feedback type: ${feedback}, skipping...`);
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
          console.log(`⚠️ No user message found before bot message for userId: ${userId}`);
        }
      } else {
        console.log(`⚠️ No bot message found for userId: ${userId} before timestamp: ${feedbackTimestamp}`);
      }
    } else {
      console.log(`⚠️ No conversation found for bot: ${botId}, user: ${userId}`);
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

    console.log(`✅ Feedback saved: ${type} for message ID: ${messageId} with content: ${messageContent}, user message: ${userMessage}`);
  } catch (err) {
    console.error('❌ Error processing feedback:', err.message, err.stack);
  }
}

module.exports = { processMessage, processFeedback };
