const mongoose = require('mongoose');
const WhatsAppSession = require('../models/WhatsAppSession');
const Rule = require('../models/Rule');
const { create, Client } = require('@open-wa/wa-automate');
const QRCode = require('qrcode');

let clients = new Map();

const createClient = async (botId) => {
  const sessionName = `bot_${botId}`;

  const client = await create({
    sessionId: sessionName,
    headless: true, // لا حاجة لمتصفح
    qrTimeout: 0, // لا تنتهي مهلة رمز QR تلقائيًا
    authTimeout: 0, // لا تنتهي مهلة المصادقة تلقائيًا
    disableSpins: true, // تعطيل رسائل التحميل في وحدة التحكم
    multiDevice: true, // دعم الأجهزة المتعددة
  });

  client.onStateChanged(async (state) => {
    if (state === 'CONNECTED') {
      console.log(`✅ تم الاتصال بنجاح للبوت ${botId}`);
      await WhatsAppSession.findOneAndUpdate(
        { botId },
        { connected: true, startTime: new Date() },
        { upsert: true }
      );
    } else if (state === 'DISCONNECTED' || state === 'UNPAIRED') {
      console.log(`❌ تم قطع الاتصال للبوت ${botId}`);
      await WhatsAppSession.findOneAndUpdate(
        { botId },
        { connected: false }
      );
      clients.delete(botId);
    }
  });

  client.onMessage(async (message) => {
    if (!message.body) return;

    const from = message.from;
    const text = message.body;

    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    let response = '';

    for (const rule of rules) {
      if (rule.type === 'general' || rule.type === 'global') {
        if (!response) response = rule.content;
      } else if (rule.type === 'qa') {
        if (text.toLowerCase().includes(rule.content.question.toLowerCase())) {
          response = rule.content.answer;
          break;
        }
      } else if (rule.type === 'products') {
        if (text.toLowerCase().includes(rule.content.product.toLowerCase())) {
          response = `المنتج: ${rule.content.product} | السعر: ${rule.content.price} ${rule.content.currency}`;
          break;
        }
      }
    }

    if (response) {
      await client.sendText(from, response);
    } else {
      await client.sendText(from, 'آسف، لا أعرف كيف أرد على هذا السؤال.');
    }
  });

  clients.set(botId, client);
  return client;
};

exports.getSession = async (req, res) => {
  const botId = req.query.botId;
  if (!botId) {
    return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
  }

  try {
    const session = await WhatsAppSession.findOne({ botId });
    res.status(200).json(session || { connected: false });
  } catch (err) {
    console.error('❌ خطأ في جلب حالة الجلسة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء جلب حالة الجلسة', error: err.message });
  }
};

exports.connect = async (req, res) => {
  const { botId, whatsappNumber } = req.body;

  if (!botId || !whatsappNumber) {
    return res.status(400).json({ message: 'معرف البوت ورقم واتساب مطلوبان' });
  }

  try {
    let client = clients.get(botId);
    if (!client) {
      client = await createClient(botId);
    }

    await client.sendText(`${whatsappNumber}@s.whatsapp.net`, 'مرحبًا! تم ربط البوت بنجاح.');
    res.status(200).json({ message: 'تم بدء الاتصال بنجاح، تم إرسال رسالة ترحيبية!' });
  } catch (err) {
    console.error('❌ خطأ في بدء الاتصال:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء بدء الاتصال', error: err.message });
  }
};

exports.connectWithQR = async (req, res) => {
  const botId = req.query.botId;

  if (!botId) {
    return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
  }

  try {
    let client = clients.get(botId);
    if (!client) {
      client = await createClient(botId);
    }

    let qrCode = null;
    const qrTimeout = setTimeout(() => {
      if (!qrCode) {
        res.status(500).json({ message: 'تعذر إنشاء رمز QR، حاول مرة أخرى.' });
      }
    }, 30000);

    client.on('qr', async (qr) => {
      clearTimeout(qrTimeout);
      qrCode = await QRCode.toDataURL(qr);
      res.status(200).json({ qrCode });
    });
  } catch (err) {
    console.error('❌ خطأ في إنشاء كود QR:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء إنشاء كود QR', error: err.message });
  }
};

exports.disconnect = async (req, res) => {
  const botId = req.query.botId;

  if (!botId) {
    return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
  }

  try {
    const client = clients.get(botId);
    if (client) {
      await client.kill();
      clients.delete(botId);
    }
    await WhatsAppSession.findOneAndUpdate(
      { botId },
      { connected: false }
    );
    res.status(200).json({ message: 'تم إنهاء الجلسة بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في إنهاء الجلسة:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء إنهاء الجلسة', error: err.message });
  }
};
