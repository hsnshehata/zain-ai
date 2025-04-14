const mongoose = require('mongoose');
const WhatsAppSession = require('../models/WhatsAppSession');
const Rule = require('../models/Rule');

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
  res.status(200).json({ message: 'تم تعطيل الاتصال مؤقتًا، جاري تحديث النظام...' });
};

exports.connectWithQR = async (req, res) => {
  res.status(200).json({ message: 'تم تعطيل الاتصال باستخدام رمز QR مؤقتًا، جاري تحديث النظام...' });
};

exports.disconnect = async (req, res) => {
  const botId = req.query.botId;

  if (!botId) {
    return res.status(400).json({ message: 'معرف البوت (botId) مطلوب' });
  }

  try {
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
