const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const axios = require('axios');
const qrcode = require('qrcode');
const WhatsAppSession = require('./models/WhatsAppSession');
const Bot = require('./models/Bot');

const clients = new Map();
const states = new Map(); // botId -> { status, qr, error }
let store = null;

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';

const initStore = async () => {
  if (store) return store;
  store = new MongoStore({ mongoose });
  return store;
};

const sendBotMessage = async ({ botId, waMessage }) => {
  try {
    const payload = {
      botId,
      userId: waMessage.from,
      message: waMessage.body || '',
      isImage: false,
      isVoice: false,
      channel: 'whatsapp',
      mediaUrl: null
    };
    const res = await axios.post(`${API_BASE}/api/bot`, payload);
    const reply = res.data?.reply || 'تم الاستلام';
    await waMessage.reply(reply);
  } catch (err) {
    console.error('WA sendBotMessage failed', err.message);
  }
};

const setState = (botId, next) => {
  const prev = states.get(botId) || {};
  states.set(botId, { ...prev, ...next });
};

const ensureClient = async (botId, botName, headless = true) => {
  await initStore();
  if (clients.has(botId)) return clients.get(botId);
  const client = new Client({
    authStrategy: new RemoteAuth({
      store,
      backupSyncIntervalMs: 300000,
      clientId: `bot-${botId}`
    }),
    puppeteer: {
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-zygote',
        '--remote-allow-origins=*'
      ]
    }
  });

  client.on('qr', async (qr) => {
    try {
      const dataUrl = await qrcode.toDataURL(qr);
      setState(botId, { qr: dataUrl, status: 'qr' });
    } catch (err) {
      setState(botId, { error: err.message, status: 'error' });
    }
  });

  client.on('loading_screen', () => setState(botId, { status: 'qr-pending' }));

  client.on('authenticated', async () => {
    setState(botId, { status: 'authenticated', qr: null });
    await WhatsAppSession.updateOne({ botId }, { connected: true }, { upsert: true });
  });

  client.on('ready', async () => {
    setState(botId, { status: 'ready', qr: null });
    await WhatsAppSession.updateOne({ botId }, { connected: true }, { upsert: true });
  });

  client.on('disconnected', async (reason) => {
    setState(botId, { status: 'disconnected', error: reason || null });
    await WhatsAppSession.updateOne({ botId }, { connected: false }, { upsert: true });
    clients.delete(botId);
  });

  client.on('auth_failure', async (msg) => {
    setState(botId, { status: 'error', error: msg });
    await WhatsAppSession.updateOne({ botId }, { connected: false }, { upsert: true });
  });

  client.on('message', async (message) => {
    await sendBotMessage({ botId, waMessage: message });
  });

  clients.set(botId, client);
  return client;
};

const connect = async (botId) => {
  const bot = await Bot.findById(botId);
  if (!bot) throw new Error('Bot not found');
  setState(botId, { status: 'starting', error: null, qr: null });
  const client = await ensureClient(botId, bot.name, true);
  if (!client.initialized) {
    await client.initialize();
  }
  return getState(botId);
};

const disconnect = async (botId) => {
  const client = clients.get(botId);
  if (client) {
    try { await client.destroy(); } catch (_) {}
    clients.delete(botId);
  }
  setState(botId, { status: 'disconnected', qr: null });
  await WhatsAppSession.updateOne({ botId }, { connected: false }, { upsert: true });
  return getState(botId);
};

const getState = (botId) => {
  return states.get(botId) || { status: 'idle' };
};

const bootstrap = async () => {
  try {
    const sessions = await WhatsAppSession.find({ connected: true });
    for (const s of sessions) {
      try {
        await connect(s.botId);
      } catch (err) {
        console.warn('Failed to restore session', s.botId?.toString(), err.message);
      }
    }
  } catch (err) {
    console.warn('bootstrap restore failed', err.message);
  }
};

module.exports = {
  connect,
  disconnect,
  getState,
  bootstrap
};
