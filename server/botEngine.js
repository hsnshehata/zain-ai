// /server/botEngine.js
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
const ChatOrder = require('./models/ChatOrder');
const { createOrUpdateFromExtraction } = require('./controllers/chatOrdersController');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// دالة لجلب الوقت الحالي
function getCurrentTime() {
  return new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
}

// دالة لتحميل الصورة وتحويلها إلى base64
const getMediaAuthHeader = (channel) => {
  if (channel === 'whatsapp' && process.env.WHATSAPP_ACCESS_TOKEN) {
    return { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };
  }
  if (process.env.FACEBOOK_ACCESS_TOKEN) {
    return { Authorization: `Bearer ${process.env.FACEBOOK_ACCESS_TOKEN}` };
  }
  return {};
};

async function fetchImageAsBase64(imageUrl, channel = 'web') {
  try {
    if (isDataUrl(imageUrl)) return imageUrl;
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...getMediaAuthHeader(channel),
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

// احتفظ بالاسم القديم للتوافق مع الاستدعاءات الحالية
async function downloadImageToBase64(imageUrl, channel = 'web') {
  return fetchImageAsBase64(imageUrl, channel);
}

async function transcribeAudio(audioUrl, channel = 'web') {
  try {
    console.log('🎙️ Starting audio transcription with LemonFox, audioUrl:', audioUrl);
    let audioBuffer;
    let filename = 'audio.mp4';
    let contentType = 'audio/mp4';
    if (isDataUrl(audioUrl)) {
      // Normalize data URLs that may contain spaces in parameters (e.g., "data:audio/ogg; codecs=opus;base64,....")
      const trimmed = audioUrl.trim();
      const commaIndex = trimmed.indexOf(',');
      if (commaIndex === -1) {
        console.error('❌ Invalid data URL for audio (no comma found)');
        throw new Error('Invalid audio URL');
      }

      const metaRaw = trimmed.slice('data:'.length, commaIndex);
      const base64Payload = trimmed.slice(commaIndex + 1).replace(/\s+/g, '');
      const metaParts = metaRaw
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean);

      const mime = metaParts[0] || 'audio/mp4';
      const hasBase64 = metaParts.some((p) => p.toLowerCase() === 'base64');
      if (!hasBase64) {
        console.error('❌ Invalid data URL for audio (missing base64 flag)');
        throw new Error('Invalid audio URL');
      }

      audioBuffer = Buffer.from(base64Payload, 'base64');
      const ext = mime?.split('/')[1] || 'mp4';
      filename = `audio.${ext}`;
      contentType = mime;
    } else if (audioUrl && audioUrl.startsWith('http')) {
      console.log('📥 Fetching audio file from:', audioUrl);
      const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer', headers: getMediaAuthHeader(channel) });
      audioBuffer = Buffer.from(audioResponse.data);
      const respMime = audioResponse.headers?.['content-type'];
      if (respMime) {
        contentType = respMime.split(';')[0] || respMime;
        const ext = contentType?.split('/')[1];
        if (ext) filename = `audio.${ext}`;
      }
    } else {
      console.error('❌ Invalid or missing audioUrl:', audioUrl);
      throw new Error('Invalid audio URL');
    }

    const body = new FormData();
    body.append('file', audioBuffer, { filename, contentType });
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

const isDataUrl = (str) => typeof str === 'string' && str.startsWith('data:');

const placeholderForMedia = (isImage, isVoice) => {
  if (isImage) return '[صورة]';
  if (isVoice) return '[صوت]';
  return '[وسائط]';
};

// أرقام مصر المسموح بها: 01xxxxxxxxx أو 00201xxxxxxxxx أو +201xxxxxxxxx
const PHONE_REGEX = /(\+201\d{9}|00201\d{9}|01\d{9})/;
const isValidPhone = (phone = '') => PHONE_REGEX.test(phone.trim());
const extractPhoneFromText = (text = '') => {
  const match = text.match(PHONE_REGEX);
  return match ? match[0] : '';
};

const STATUS_LABELS = {
  pending: 'قيد المراجعة',
  processing: 'قيد التنفيذ',
  confirmed: 'تم التأكيد ويُجهَّز للشحن',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'تم الإلغاء',
};

const statusText = (status) => STATUS_LABELS[status] || status || 'غير معروف';
const isStatusInquiry = (text = '') => /(حالة|متابعة|وصل|الشحنة|الشحن|تتبع|اوردر|أوردر|طلبى|طلبي|رقم الطلب|order|tracking)/i.test(text);
const isModifyIntent = (text = '') => /(تعديل|عدّل|عدل|غير|غيّر).*طلب/i.test(text) || /(عايز|حابب).*أعدل/i.test(text);
const isCancelIntent = (text = '') => /(الغاء|إلغاء|cancel|الغى|الغي|عايز الغي|عايز ألغي|الغى الطلب|الغي الطلب)/i.test(text);
const isNewOrderIntent = (text = '') => /(طلب جديد|طلب تاني|طلب ثاني|عايز اطلب تاني|عايز أطلب تاني|أعمل طلب تاني)/i.test(text);

async function extractChatOrderIntent({ bot, channel, userMessageContent, conversationId, sourceUserId, sourceUsername, messageId, transcript = [] }) {
  try {
    if (!userMessageContent || typeof userMessageContent !== 'string') return null;

    const transcriptText = Array.isArray(transcript)
      ? transcript
          .slice(-30) // نطاق أحدث الرسائل مع سياق كافٍ لاستخلاص العناصر
          .map((m) => `${m.role === 'assistant' ? 'البوت' : 'العميل'}: ${m.content || ''}`)
          .join('\n')
      : '';

    const prompt = `أنت مساعد لاستخلاص طلبات العملاء من محادثة متعددة الرسائل.
  اعتمد على المحادثة كاملة (الترانسكربت) لبناء الطلب حتى لو كانت الرسالة الأخيرة ناقصة.
  أعد دائماً JSON فقط دون أي نص آخر بالمفاتيح التالية:
  - intent: ضع true إذا توفرت بيانات كافية (منتج/كمية/اسم/هاتف/عنوان)، وإلا false.
  - customerName, customerPhone, customerAddress, customerNote.
  - items: مصفوفة عناصر { title, quantity, note } (quantity رقم صحيح >=1).
  - status: one of pending|processing|confirmed|shipped|delivered|cancelled. اختر confirmed لو العميل قدّم كل البيانات ووافق، وإلا pending/processing.
  - freeText: تلخيص مختصر للطلب.
  التزم بتنسيق رقم الهاتف المصري: 01xxxxxxxxx أو 00201xxxxxxxxx أو +201xxxxxxxxx.
  عند وجود أكثر من قيمة لنفس الحقل، استخدم أحدث قيمة ذُكرت في نهاية المحادثة وتجاهل القيم الأقدم.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `المحادثة الكاملة:\n${transcriptText}\n---\nآخر رسالة من العميل: ${userMessageContent.slice(0, 2000)}` }
      ],
      max_tokens: 400
    });

    const raw = response.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    const cancelIntent = isCancelIntent(userMessageContent);
    const newOrderIntent = isNewOrderIntent(userMessageContent);
    const modifyIntent = isModifyIntent(userMessageContent);

    // لو هو إلغاء فقط بدون بيانات كافية، لا نخرج مبكرًا لكي نلتقط الطلب المفتوح ونلغيه
    if (!parsed || (parsed.intent === false && !cancelIntent)) return null;

    // حاول استخراج رقم صالح وفق الأنماط المسموحة
    let phoneCandidate = parsed.customerPhone || '';
    if (!isValidPhone(phoneCandidate)) {
      phoneCandidate = extractPhoneFromText(transcriptText) || extractPhoneFromText(userMessageContent) || phoneCandidate;
    }
    if (isValidPhone(phoneCandidate)) {
      parsed.customerPhone = phoneCandidate;
    } else {
      parsed.customerPhone = '';
    }

    const extractQuantity = () => {
      const haystack = `${transcriptText}\n${userMessageContent}`;
      const m1 = haystack.match(/العدد\s*[:\-]?\s*(\d{1,3})/i);
      if (m1 && Number(m1[1]) > 0) return Number(m1[1]);
      const m2 = haystack.match(/(\d{1,3})\s*(كرة|كرات|كوره|كورة)/i);
      if (m2 && Number(m2[1]) > 0) return Number(m2[1]);
      return null;
    };

    const latestOpenOrder = async () => {
      const filters = [];
      const phoneFromThread = extractPhoneFromText(transcriptText) || extractPhoneFromText(userMessageContent);
      const phoneToUse = isValidPhone(parsed.customerPhone) ? parsed.customerPhone : phoneFromThread;

      if (phoneToUse) filters.push({ customerPhone: phoneToUse });
      if (sourceUserId) filters.push({ sourceUserId });
      if (conversationId) filters.push({ conversationId });

      if (!filters.length) return null;

      return ChatOrder.findOne({
        botId: bot._id,
        status: { $in: ['pending', 'processing', 'confirmed'] },
        $or: filters,
      }).sort({ createdAt: -1 });
    };

    let existingOpenOrder = await latestOpenOrder();

    let safeItems = Array.isArray(parsed.items) ? parsed.items.map((it) => ({
      title: (it.title || '').trim(),
      quantity: Math.max(Number(it.quantity) || 0, 0),
      note: (it.note || '').trim(),
      price: it.price
    })) : [];

    const ensurePrice = (title = '', price) => {
      const numeric = Number(price) || 0;
      if (numeric > 0) return numeric;
      if (/(كوره|كورة|كرة|كرات|ball)/i.test(title)) return 1900;
      return 0;
    };

    // إذا لم يعد النموذج عناصر أو كانت الكميات غير صالحة، أنشئ بند افتراضي من المحادثة
    if (!safeItems.length || safeItems.every((it) => !it.quantity)) {
      const qty = extractQuantity() || 1;
      safeItems = [{ title: safeItems[0]?.title || 'كرة', quantity: qty, note: parsed.customerNote || '', price: ensurePrice('كرة', parsed.items?.[0]?.price) }];
    } else {
      safeItems = safeItems.map((it) => ({ ...it, quantity: Math.max(Number(it.quantity) || 1, 1), price: ensurePrice(it.title, it.price) }));
    }

    const effectiveName = (parsed.customerName || existingOpenOrder?.customerName || '').trim();
    const effectivePhone = (parsed.customerPhone || existingOpenOrder?.customerPhone || '').trim();
    const effectiveAddress = (parsed.customerAddress || existingOpenOrder?.customerAddress || '').trim();
    const effectiveItems = safeItems.length ? safeItems : (existingOpenOrder?.items || []);

    const hasRequiredData = () => {
      const nameOk = Boolean(effectiveName);
      const phoneOk = isValidPhone(effectivePhone || '');
      const addressOk = Boolean(effectiveAddress);
      const priced = (effectiveItems || []).filter((it) => Math.max(Number(it.quantity) || 0, 0) > 0 && Math.max(Number(it.price) || 0, 0) > 0);
      return nameOk && phoneOk && addressOk && priced.length > 0;
    };

    if (cancelIntent && existingOpenOrder) {
      if (['shipped', 'delivered'].includes(existingOpenOrder.status)) {
        return { chatOrder: existingOpenOrder, cancelled: false, cancelBlocked: true, customerPhone: effectivePhone };
      }
      existingOpenOrder.status = 'cancelled';
      if (!Array.isArray(existingOpenOrder.history)) existingOpenOrder.history = [];
      existingOpenOrder.history.push({ status: 'cancelled', changedBy: null, note: 'إلغاء من المحادثة', changedAt: new Date() });
      existingOpenOrder.lastMessageId = messageId || existingOpenOrder.lastMessageId;
      await existingOpenOrder.save();
      return { chatOrder: existingOpenOrder, cancelled: true, customerPhone: effectivePhone };
    }

    if (existingOpenOrder && !['shipped', 'delivered', 'cancelled'].includes(existingOpenOrder.status)) {
      // لو عميل بيطلب طلب جديد بنفس الرقم، ما نعدلش الطلب الحالي ونرجع تعارض
      if (newOrderIntent && !modifyIntent) {
        return { conflict: true, existingOrder: existingOpenOrder, customerPhone: effectivePhone, reason: 'open-order-exists' };
      }

      // تحديث الطلب الحالي في حالة التأكيد/التعديل
      console.log('ℹ️ Updating existing open order instead of creating new one');
      if (effectiveItems.length) existingOpenOrder.items = effectiveItems;
      if (effectiveName) existingOpenOrder.customerName = effectiveName;
      if (effectiveAddress) existingOpenOrder.customerAddress = effectiveAddress;
      if (effectivePhone) existingOpenOrder.customerPhone = effectivePhone;
      if (parsed.customerNote) existingOpenOrder.customerNote = parsed.customerNote;
      if (parsed.status && parsed.status !== existingOpenOrder.status) {
        existingOpenOrder.status = parsed.status;
        if (!Array.isArray(existingOpenOrder.history)) existingOpenOrder.history = [];
        existingOpenOrder.history.push({ status: parsed.status, changedBy: null, note: 'تحديث من المحادثة', changedAt: new Date() });
      }
      existingOpenOrder.lastMessageId = messageId || existingOpenOrder.lastMessageId;
      const itemsTotal = (existingOpenOrder.items || []).reduce((sum, it) => sum + (Math.max(Number(it.price) || 0, 0) * Math.max(Number(it.quantity) || 1, 1)), 0);
      if (itemsTotal > 0) existingOpenOrder.totalAmount = itemsTotal + Math.max(Number(existingOpenOrder.deliveryFee) || 0, 0);
      if (hasRequiredData()) {
        await existingOpenOrder.save();
        return { chatOrder: existingOpenOrder, conflict: false, customerPhone: effectivePhone };
      }
      // لو البيانات ناقصة رغم وجود طلب مفتوح، نرجع تعارض لكن بدون حفظ
      return { conflict: true, existingOrder: existingOpenOrder, customerPhone: effectivePhone, reason: 'missing-data' };
    }

    console.log('📦 Parsed order payload:', {
      customerName: effectiveName,
      customerPhone: effectivePhone,
      customerAddress: effectiveAddress,
      status: parsed.status,
      items: effectiveItems
    });

    // لو العميل طلب إلغاء ومافيش طلب مفتوح، ما تنشئش جديد
    if (cancelIntent && !existingOpenOrder) {
      console.log('⚠️ Cancel intent with no existing order; skipping creation');
      return { chatOrder: null, cancelled: false };
    }

    const chatOrder = await createOrUpdateFromExtraction({
      botId: bot._id,
      channel,
      conversationId,
      sourceUserId,
      sourceUsername,
      customerName: effectiveName || '',
      customerPhone: effectivePhone || '',
      customerEmail: parsed.customerEmail || '',
      customerAddress: effectiveAddress || '',
      customerNote: parsed.customerNote || '',
      items: effectiveItems,
      freeText: parsed.freeText || userMessageContent,
      status: parsed.status || 'pending',
      messageId
    });

    console.log('🧾 Chat order extracted/updated:', chatOrder?._id || 'none');
    if (!chatOrder) {
      console.log('⚠️ Chat order not saved (missing required data after controller validation)', {
        hasRequiredData: hasRequiredData(),
        effectiveName,
        effectivePhone,
        effectiveAddress,
        effectiveItems,
      });
    }
    return { chatOrder };
  } catch (err) {
    console.error('❌ فشل في استخراج طلب المحادثة:', err.message);
    return null;
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
          systemPrompt += 'محتويات المتجر:\n';
          products.forEach((product) => {
            systemPrompt += `المنتج: ${product.productName}، السعر: ${product.price} ${product.currency}، الرابط: zainbot.com/store/${store.storeLink}?productId=${product._id}، الصورة: ${product.imageUrl || 'غير متوفرة'}، الوصف: ${product.description || 'غير متوفر'}، المخزون: ${product.stock}.\n`;
          });
        } else {
          systemPrompt += 'لا توجد منتجات متاحة حاليًا في المتجر.\n';
        }
      }
    }

    console.log('📝 System prompt:', systemPrompt);

    let userMessageContent = message;

    // Normalize media content: avoid storing base64 in the conversation
    if (isDataUrl(mediaUrl)) {
      userMessageContent = placeholderForMedia(isImage, isVoice);
    }

    if (isVoice) {
      try {
        const voiceSource = mediaUrl || message;
        if (voiceSource && (voiceSource.startsWith('http') || isDataUrl(voiceSource))) {
          console.log('🎙️ Voice message, transcribing from source:', voiceSource.slice(0, 80));
          userMessageContent = await transcribeAudio(voiceSource, finalChannel);
          console.log('💬 Transcribed audio message:', userMessageContent);
        } else {
          console.log('⚠️ No valid mediaUrl or audio payload for voice:', mediaUrl, message);
          return 'عذرًا، لم أتمكن من تحليل الصوت بسبب رابط غير صالح. أرسل المقطع الصوتي من جديد أو اكتب النص.';
        }
      } catch (err) {
        console.error('❌ Failed to transcribe audio:', err.message);
        return err.message;
      }
    } else if (isImage) {
      userMessageContent = message || mediaUrl || '[صورة]';
      if (isDataUrl(userMessageContent)) userMessageContent = placeholderForMedia(true, false);
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

    // محاولة استخراج طلب محادثة تلقائياً
    let extractionResult = null;
    try {
      extractionResult = await extractChatOrderIntent({
        bot,
        channel: finalChannel,
        userMessageContent,
        conversationId: conversation._id,
        sourceUserId: finalUserId,
        sourceUsername: conversation.username,
        messageId: messageId || undefined,
        transcript: conversation.messages
      });
    } catch (e) {
      console.warn('⚠️ تعذر استخراج طلب المحادثة:', e.message);
    }

    const contextMessages = conversation.messages
      .slice(-50) // take latest 50
      .filter((msg) => !isDataUrl(msg.content)) // drop any stored data URLs
      .slice(-21, -1); // keep last 20 after filtering

    const context = contextMessages.map(msg => ({
      role: msg.role,
      content: msg.content.length > 2000 ? `${msg.content.slice(0, 2000)}...` : msg.content,
    }));
    console.log('🧠 Conversation context:', context.length, 'messages');

    let reply = '';

    // ردود خاصة بالحالة أو التعارض قبل الذكاء الاصطناعي العام
    if (extractionResult?.conflict) {
      const existing = extractionResult.existingOrder || extractionResult.chatOrder;
      const st = existing ? statusText(existing.status) : 'غير معروف';
      reply = `في طلب جاري بنفس الرقم ${extractionResult.customerPhone} حالته ${st}. تحب تعدل الطلب الحالي ولا تسجل طلب جديد؟`;
    } else if (extractionResult?.cancelled) {
      reply = 'تم إلغاء الطلب الحالي. لو حابب تعمل طلب جديد ابعت البيانات من جديد.';
    } else if (extractionResult?.cancelBlocked) {
      reply = 'الطلب تم شحنه بالفعل، لذلك لا يمكن إلغاؤه الآن. لو محتاج مساعدة إضافية، بلغني.';
    } else if (isStatusInquiry(userMessageContent)) {
      let latestOrder = await ChatOrder.findOne({ botId, sourceUserId: finalUserId }).sort({ createdAt: -1 });
      if (!latestOrder) {
        const phoneInMessage = extractPhoneFromText(userMessageContent);
        if (phoneInMessage) {
          latestOrder = await ChatOrder.findOne({ botId, customerPhone: phoneInMessage }).sort({ createdAt: -1 });
        }
      }

      if (latestOrder) {
        const baseStatus = statusText(latestOrder.status);
        if (['shipped', 'delivered'].includes(latestOrder.status)) {
          reply = `حالة طلبك: ${baseStatus}. الإجمالي ${latestOrder.totalAmount || 0} جنيه. لو محتاج طلب جديد، ابعت التفاصيل.`;
        } else {
          reply = `حالة طلبك الحالي: ${baseStatus}. لو حابب تعدل أي تفاصيل قبل الشحن، قولّي التعديل.`;
        }
      } else {
        reply = 'مش لاقي طلب برقمك. ممكن تبعت رقم الموبايل أو رقم الطلب علشان أتحقق؟';
      }
    } else if (isModifyIntent(userMessageContent)) {
      let latestOrder = await ChatOrder.findOne({ botId, sourceUserId: finalUserId }).sort({ createdAt: -1 });
      if (!latestOrder) {
        const phoneInMessage = extractPhoneFromText(userMessageContent);
        if (phoneInMessage) {
          latestOrder = await ChatOrder.findOne({ botId, customerPhone: phoneInMessage }).sort({ createdAt: -1 });
        }
      }

      if (latestOrder) {
        const baseStatus = statusText(latestOrder.status);
        if (['shipped', 'delivered'].includes(latestOrder.status)) {
          reply = `الطلب حالته ${baseStatus} وبالتالي لا يمكن تعديله بعد الشحن. لو عايز طلب جديد، ابعت البيانات.`;
        } else {
          reply = `تمام، هنعدل على طلبك الحالي (حالته ${baseStatus}). ايه التعديل اللي تحب تعمله؟`;
        }
      } else {
        reply = 'عشان أعدل، محتاج ألاقي الطلب. ابعت رقم الموبايل أو رقم الطلب.';
      }
    }

    if (userMessageContent && !isImage && !isVoice && !reply) {
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

      // التحقق من محتويات المتجر إذا لم يتم العثور على رد من القواعد الأخرى
      if (!reply && bot && bot.storeId) {
        const store = await Store.findById(bot.storeId);
        if (store) {
          const products = await Product.find({ storeId: store._id });
          for (const product of products) {
            if (userMessageContent.toLowerCase().includes(product.productName.toLowerCase())) {
              reply = `المنتج: ${product.productName}، السعر: ${product.price} ${product.currency}، الرابط: zainbot.com/store/${store.storeLink}?productId=${product._id}، الصورة: ${product.imageUrl || 'غير متوفرة'}، الوصف: ${product.description || 'غير متوفر'}، المخزون: ${product.stock}.`;
              break;
            }
          }
        }
      }
    }

    if (!reply) {
      if (isImage) {
        if (!mediaUrl) {
          console.error('❌ Missing mediaUrl for image');
          return 'عذرًا، لم أتمكن من تحليل الصورة بسبب رابط غير صالح.';
        }

        let imageDataUrl;
        if (isDataUrl(mediaUrl)) {
          // إذا وصلتنا الصورة كـ data URL نستخدمها مباشرة بدون تنزيل
          imageDataUrl = mediaUrl;
          console.log('🖼️ Image provided as data URL, skipping download');
        } else if (mediaUrl.startsWith('http')) {
          console.log('🖼️ Processing image with mediaUrl:', mediaUrl);
          try {
            imageDataUrl = await downloadImageToBase64(mediaUrl, finalChannel);
          } catch (err) {
            console.error('❌ Failed to download image:', err.message);
            return err.message;
          }
        } else {
          console.error('❌ Invalid or unsupported mediaUrl for image:', mediaUrl);
          return 'عذرًا، رابط الصورة غير مدعوم. أرسل صورة جديدة من فضلك.';
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
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 2000,
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
