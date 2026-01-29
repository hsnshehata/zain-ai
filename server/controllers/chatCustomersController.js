const ChatCustomer = require('../models/ChatCustomer');
const Bot = require('../models/Bot');

const MAX_LIMIT = 300;

const canAccessBot = async (botId, userId, role) => {
  if (role === 'superadmin') return true;
  const bot = await Bot.findById(botId).select('userId');
  if (!bot) return false;
  return String(bot.userId) === String(userId);
};

function buildUpdate(settable) {
  const $set = {};
  Object.entries(settable).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    $set[k] = v;
  });
  return $set;
}

async function upsertChatCustomerProfile({
  botId,
  conversationId,
  channel,
  sourceUserId,
  sourceUsername,
  name,
  phone,
  address,
  email,
  lastOrderId,
  lastOrderAt,
  lastMessageId,
}) {
  if (!botId || !channel || !sourceUserId) return null;

  const setOnInsert = { botId, channel, sourceUserId };
  const $set = buildUpdate({
    conversationId,
    sourceUsername,
    name,
    phone,
    address,
    email,
    lastOrderId,
    lastMessageId,
    lastMessageAt: lastMessageId ? new Date() : undefined,
    lastOrderAt: lastOrderAt || (lastOrderId ? new Date() : undefined),
  });

  const doc = await ChatCustomer.findOneAndUpdate(
    { botId, sourceUserId },
    { $set, $setOnInsert: setOnInsert },
    { new: true, upsert: true }
  );
  return doc;
}

async function listCustomers(req, res) {
  try {
    const { botId } = req.query;
    if (!botId) return res.status(400).json({ message: 'botId مطلوب' });

    const allowed = await canAccessBot(botId, req.user.userId, req.user.role);
    if (!allowed) return res.status(403).json({ message: 'غير مصرح بالوصول' });

    const customers = await ChatCustomer.find({ botId })
      .sort({ updatedAt: -1 })
      .limit(MAX_LIMIT);

    return res.json({ customers });
  } catch (err) {
    console.error('listCustomers error:', err.message, err.stack);
    return res.status(500).json({ message: 'خطأ في جلب بيانات العملاء' });
  }
}

module.exports = {
  listCustomers,
  upsertChatCustomerProfile,
};
