const waService = require('../waService');
const Bot = require('../models/Bot');

const ensureBotAccess = async (botId, userId) => {
  const bot = await Bot.findById(botId);
  if (!bot) throw new Error('البوت غير موجود');
  if (bot.userId?.toString() !== userId?.toString()) {
    const err = new Error('غير مصرح لك بإدارة هذا البوت');
    err.status = 403;
    throw err;
  }
  return bot;
};

const connect = async (req, res) => {
  try {
    const { botId } = req.params;
    await ensureBotAccess(botId, req.user?.userId);
    const state = await waService.connect(botId);
    res.json(state);
  } catch (err) {
    console.error('❌ WA connect error:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في السيرفر' });
  }
};

const disconnect = async (req, res) => {
  try {
    const { botId } = req.params;
    await ensureBotAccess(botId, req.user?.userId);
    const state = await waService.disconnect(botId);
    res.json(state);
  } catch (err) {
    console.error('❌ WA disconnect error:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'خطأ في السيرفر' });
  }
};

const status = async (req, res) => {
  try {
    const { botId } = req.params;
    await ensureBotAccess(botId, req.user?.userId);
    res.json(waService.getState(botId));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'خطأ في السيرفر' });
  }
};

module.exports = {
  connect,
  disconnect,
  status
};
