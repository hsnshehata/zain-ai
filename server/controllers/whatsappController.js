const { Client, RemoteAuth } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const WhatsAppSession = require('../models/WhatsAppSession');
const Rule = require('../models/Rule');
const QRCode = require('qrcode');

let clients = new Map(); // لتخزين جلسات واتساب لكل botId

// دالة لإنشاء عميل واتساب
const createClient = async (botId) => {
  const session = await WhatsAppSession.findOne({ botId });
  const client = new Client({
    authStrategy: new RemoteAuth({
      store: new MongoStore({ mongoose }),
      backupSyncIntervalMs: 300000,
      clientId: botId.toString(),
    }),
    puppeteer: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('authenticated', async () => {
    console.log(`✅ تم الاتصال بنجاح للبوت ${botId}`);
    await WhatsAppSession.findOneAndUpdate(
      { botId },
      { connected: true, startTime: new Date() },
      { upsert: true }
    );
  });

  client.on('disconnected', async (reason) => {
    console.log(`❌ تم قطع الاتصال للبوت ${botId}: ${reason}`);
    await WhatsAppSession.findOneAndUpdate(
      { botId },
      { connected: false }
    );
    clients.delete(botId);
  });

  client.on('message', async (message) => {
    const rules = await Rule.find({ $or: [{ botId }, { type: 'global' }] });
    let response = '';

    for (const rule of rules) {
      if (rule.type === 'general' || rule.type === 'global') {
        if (!response) response = rule.content; // أول قاعدة عامة أو موحدة
      } else if (rule.type === 'qa') {
        if (message.body.toLowerCase().includes(rule.content.question.toLowerCase())) {
          response = rule.content.answer;
          break;
        }
      } else if (rule.type === 'products') {
        if (message.body.toLowerCase().includes(rule.content.product.toLowerCase())) {
          response = `المنتج: ${rule.content.product} | السعر: ${rule.content.price} ${rule.content.currency}`;
          break;
        }
      }
    }

    if (response) {
      message.reply(response);
    } else {
      message.reply('آسف، لا أعرف كيف أرد على هذا السؤال.');
    }
  });

  await client.initialize();
  clients.set(botId, client);
  return client;
};

// جلب حالة الجلسة
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

// بدء الاتصال باستخدام الرقم
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
    res.status(200).json({ message: 'تم بدء الاتصال، يرجى الانتظار...' });
  } catch (err) {
    console.error('❌ خطأ في بدء الاتصال:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء بدء الاتصال', error: err.message });
  }
};

// بدء الاتصال باستخدام كود QR
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

    client.on('qr', async (qr) => {
      const qrCode = await QRCode.toDataURL(qr);
      res.status(200).json({ qrCode });
    });
  } catch (err) {
    console.error('❌ خطأ في إنشاء كود QR:', err.message, err.stack);
    res.status(500).json({ message: 'خطأ في السيرفر أثناء إنشاء كود QR', error: err.message });
  }
};

// إنهاء الجلسة
exports.disconnect = async (req, res) => {
  const botId = req.query.botId;

  if (!botId) {
    return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
  }

  try {
    const client = clients.get(botId);
    if (client) {
      await client.destroy();
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
