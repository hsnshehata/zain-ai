// /server/controllers/messagesController.js

const Conversation = require('../models/Conversation');

// Get daily messages for a bot
exports.getDailyMessages = async (req, res) => {
  try {
    const { botId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { botId };
    if (startDate || endDate) {
      query['messages.timestamp'] = {};
      if (startDate) query['messages.timestamp'].$gte = new Date(startDate);
      if (endDate) query['messages.timestamp'].$lte = new Date(endDate);
    }

    const conversations = await Conversation.find(query);

    // تجميع الرسائل حسب اليوم
    const dailyMessages = {};
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        const date = new Date(msg.timestamp).toISOString().split('T')[0]; // الحصول على التاريخ بصيغة YYYY-MM-DD
        if (!dailyMessages[date]) {
          dailyMessages[date] = 0;
        }
        dailyMessages[date]++;
      });
    });

    // تحويل البيانات لمصفوفة مرتبة
    const result = Object.keys(dailyMessages)
      .sort() // ترتيب التواريخ
      .map(date => ({
        date: date,
        count: dailyMessages[date],
      }));

    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching daily messages:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
