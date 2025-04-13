const { Client, RemoteAuth } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const WhatsAppSession = require('../models/WhatsAppSession');
const Rule = require('../models/Rule');
const QRCode = require('qrcode');

// متجر مخصص لتخزين الجلسات في MongoDB
class CustomMongoStore {
  constructor({ clientId }) {
    this.clientId = clientId;
  }

  // التحقق من وجود الجلسة
  async sessionExists() {
    try {
      const session = await WhatsAppSession.findOne({ botId: this.clientId });
      return session && session.sessionData ? true : false;
    } catch (err) {
      console.error(`❌ خطأ في التحقق من وجود الجلسة للبوت ${this.clientId}:`, err);
      return false;
    }
  }

  // حفظ بيانات الجلسة
  async save(data) {
    try {
      await WhatsAppSession.findOneAndUpdate(
        { botId: this.clientId },
        { sessionData: data },
        { upsert: true }
      );
      console.log(`✅ تم حفظ بيانات الجلسة للبوت ${this.clientId}`);
    } catch (err) {
      console.error(`❌ خطأ في حفظ بيانات الجلسة للبوت ${this.clientId}:`, err);
      throw err;
    }
  }

  // استرجاع بيانات الجلسة
  async load() {
    try {
      const session = await WhatsAppSession.findOne({ botId: this.clientId });
      return session && session.sessionData ? session.sessionData : null;
    } catch (err) {
      console.error(`❌ خطأ في استرجاع بيانات الجلسة للبوت ${this.clientId}:`, err);
      return null;
    }
  }

  // إزالة بيانات الجلسة
  async remove() {
    try {
      await WhatsAppSession.findOneAndUpdate(
        { botId: this.clientId },
        { sessionData: null, connected: false }
      );
      console.log(`✅ تم إزالة بيانات الجلسة للبوت ${this.clientId}`);
    } catch (err) {
      console.error(`❌ خطأ في إزالة بيانات الجلسة للبوت ${this.clientId}:`, err);
      throw err;
    }
  }
}

let clients = new Map();

const createClient = async (botId) => {
  const session = await WhatsAppSession.findOne({ botId });
  const client = new Client({
    authStrategy: new RemoteAuth({
      store: new CustomMongoStore({ clientId: botId }),
      backupSyncIntervalMs: 300000,
      clientId: botId.toString(),
    }),
    puppeteer: {
      headless: true,
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
        if (!response) response = rule.content;
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
    res.status(200).json({ message: 'تم بدء الاتصال، يرجى الانتظار...' });
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

    client.on('qr', async (qr) => {
      const qrCode = await QRCode.toDataURL(qr);
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
