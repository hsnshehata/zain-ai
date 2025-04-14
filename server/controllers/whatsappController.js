const mongoose = require('mongoose');
const WhatsAppSession = require('../models/WhatsAppSession');
const Rule = require('../models/Rule');
const { Buffer } = require('buffer');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');

let clients = new Map();

const createClient = async (botId) => {
  // إعداد التخزين باستخدام MongoDB
  const authState = await useMongoDBAuthState(botId);

  const sock = makeWASocket({
    auth: authState.state,
    printQRInTerminal: false, // لا نطبع رمز QR في وحدة التحكم
  });

  // حفظ الجلسة عند الاتصال
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
        createClient(botId); // إعادة الاتصال تلقائيًا
      }
    } else if (connection === 'open') {
      console.log(`✅ تم الاتصال بنجاح للبوت ${botId}`);
      await WhatsAppSession.findOneAndUpdate(
        { botId },
        { connected: true, startTime: new Date() },
        { upsert: true }
      );
    } else if (qr) {
      // إذا تم إنشاء رمز QR، سيتم التعامل معه في connectWithQR
      console.log(`🔗 تم إنشاء رمز QR للبوت ${botId}`);
    }
  });

  // التعامل مع الرسائل الواردة
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
  const state = {
    creds: {},
    keys: {},
  };

  const session = await WhatsAppSession.findOne({ botId });
  if (session && session.sessionData) {
    state.creds = session.sessionData.creds || {};
    state.keys = session.sessionData.keys || {};
  }

  return {
    state,
    saveCreds: async () => {
      try {
        await WhatsAppSession.findOneAndUpdate(
          { botId },
          { sessionData: { creds: state.creds, keys: state.keys } },
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

    // إرسال رسالة ترحيبية
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

    client.sock.ev.on('connection.update', async (update) => {
      const { qr } = update;
      if (qr) {
        const qrCode = await QRCode.toDataURL(qr);
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
