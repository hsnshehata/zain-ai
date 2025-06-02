const OpenAI = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
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

async function processMessage(botId, userId, message, isImage = false, isVoice = false, messageId = null, channel = 'web') {
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
        console.log(`📋 Generated new userId for channel ${channel} due to missing or invalid userId: ${finalUserId}`);
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
    console.log('🤖 Processing message for bot:', botId, 'user:', finalUserId, 'message:', message, 'channel:', finalChannel, 'isImage:', isImage, 'isVoice:', isVoice);

    // تعديل الشرط لقبول الصور حتى لو message فاضي
    if (!botId || !finalUserId || (!message && !isImage && !isVoice)) {
      console.log(`❌ Missing required fields: botId=${botId}, userId=${finalUserId}, message=${message}`);
      throw new Error('Bot ID, message, and user ID are required');
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
    console.log('📝 System prompt:', systemPrompt);

    let userMessageContent = message;

    if (isVoice) {
      if (!message) {
        userMessageContent = '[Voice message]';
      } else {
        userMessageContent = message; // النص جاهز من connect.js
        console.log('💬 Using pre-transcribed audio message:', userMessageContent);
      }
    } else if (isImage) {
      userMessageContent = message || '[صورة]'; // نص افتراضي للصورة
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

    if (message && !isImage && !isVoice) {
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
    }

    if (!reply) {
      if (isImage) {
        console.log('🖼️ Processing image with mediaUrl:', message);
        const response = await openai.chat.completions.create({
          model: 'gpt-4o', // استخدام gpt-4o لتحليل الصور
          messages: [
            { role: 'system', content: systemPrompt },
            ...context,
            {
              role: 'user',
              content: [
                { type: 'text', text: userMessageContent || 'رد على حسب محتوى الصورة' },
                { type: 'image_url', image_url: { url: message } },
              ],
            },
          ],
          max_tokens: 5000,
        });
        reply = response.choices[0].message.content || 'عذرًا، لم أتمكن من تحليل الصورة.';
        console.log('🖼️ Image processed:', reply);
      } else if (isVoice && userMessageContent === '[Voice message]') {
        reply = 'عذرًا، لم أتمكن من تحليل الصوت. ممكن تبعتلي نص بدل الصوت؟';
        console.log('🎙️ Voice message not transcribed, replying with fallback message');
      } else {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...context,
          { role: 'user', content: userMessageContent },
        ];
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-mini-2025-04-14', // نموذج النصوص والصوت
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
    return 'عذرًا، حدث خطأ أثناء معالجة طلبك.';
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
