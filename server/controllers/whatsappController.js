const mongoose = require('mongoose');
const WhatsAppSession = require('../models/WhatsAppSession');
const Rule = require('../models/Rule');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const pino = require('pino');

let clients = new Map();

const createClient = async (botId) => {
  // إعداد التخزين باستخدام MongoDB
  const authState = await useMongoDBAuthState(botId);

  // إعداد تسجيل الأخطاء باستخدام pino
  const logger = pino({ level: 'silent' }); // تعطيل التسجيل الافتراضي لتجنب الرسائل غير الضرورية

  const sock = makeWASocket({
    auth: authState.state,
    logger,
    printQRInTerminal: false,
    syncFullHistory: false, // تقليل استهلاك الموارد
    connectTimeoutMs: 30000, // مهلة الاتصال 30 ثانية
    keepAliveIntervalMs: 30000, // الحفاظ على الاتصال
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`❌ تم قطع الاتصال للبوت ${botId}:`, lastDisconnect?.error?.message);

      await WhatsAppSession.findOneAndUpdate(
        { botId },
        { connected: false }
      );
      clients.delete(botId);

      if (shouldReconnect) {
        createClient(botId);
      }
    } else if (connection === 'open') {
      console.log(`✅ تم الاتصال بنجاح للبوت ${botId}`);
      await WhatsAppSession.findOneAndUpdate(
        { botId },
        { connected: true, startTime: new Date() },
        { upsert: true }
      );
    } else if (qr) {
      console.log(`🔗 تم إنشاء رمز QR للبوت ${botId}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const message = messages[0];
    if (!message.message) return;

    const from = message.key.remoteJid;
    const text = message.message.conversation || message.message.extendedTextMessage?.text;

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
      await sock.sendMessage(from, { text: response });
    } else {
      await sock.sendMessage(from, { text: 'آسف، لا أعرف كيف أرد على هذا السؤال.' });
    }
  });

  clients.set(botId, { sock, authState });
  return { sock, authState };
};

// دالة مخصصة لحفظ الجلسات في MongoDB
const useMongoDBAuthState = async (botId) => {
  const session = await WhatsAppSession.findOne({ botId });
  let creds = {};
  let keys = {};

  if (session && session.sessionData) {
    creds = session.sessionData.creds || {};
    keys = session.sessionData.keys || {};
  }

  const state = { creds, keys };

  return {
    state,
    saveCreds: async () => {
      try {
        const sessionData = {
          creds: state.creds || {},
          keys: state.keys || {},
        };

        await WhatsAppSession.findOneAndUpdate(
          { botId },
          { sessionData },
          { upsert: true }
        );
        console.log(`✅ تم حفظ بيانات الجلسة للبوت ${botId}`);
      } catch (err) {
        console.error(`❌ خطأ في حفظ بيانات الجلسة للبوت ${botId}:`, err);
        throw err;
      }
    },
  };
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

    await client.sock.sendMessage(`${whatsappNumber}@s.whatsapp.net`, {
      text: 'مرحبًا! تم ربط البوت بنجاح.',
    });

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

    client.sock.ev.on('connection.update', async (update) => {
      const { qr } = update;
      if (qr) {
        clearTimeout(qrTimeout);
        qrCode = await QRCode.toDataURL(qr);
        res.status(200).json({ qrCode });
      }
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
      await client.sock.logout();
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
