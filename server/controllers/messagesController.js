const Conversation = require("../models/Conversation");

// Get daily messages for a bot
exports.getDailyMessages = async (req, res) => {
  try {
    const { botId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { botId };
    if (startDate || endDate) {
      query["messages.timestamp"] = {};
      if (startDate) query["messages.timestamp"].$gte = new Date(startDate);
      if (endDate) query["messages.timestamp"].$lte = new Date(endDate);
    }

    const conversations = await Conversation.find(query).lean();

    // تجميع الرسائل حسب اليوم
    const dailyMessages = {};
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        const date = new Date(msg.timestamp).toISOString().split("T")[0]; // الحصول على التاريخ بصيغة YYYY-MM-DD
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
    console.error("Error fetching daily messages:", err.message);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
};

// Get conversations for a bot
exports.getMessages = async (req, res) => {
  try {
    const botId = req.params.botId;
    const channelType = req.query.type;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const page = parseInt(req.query.page) || 1; // رقم الصفحة
    const limit = parseInt(req.query.limit) || 20; // عدد العناصر في الصفحة

    if (!botId || !channelType) {
      return res.status(400).json({ message: "معرف البوت أو القناة غير محدد." });
    }

    const query = { botId, channel: channelType };

    if (startDate && endDate) {
      query["messages.timestamp"] = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query["messages.timestamp"] = { $gte: startDate };
    } else if (endDate) {
      query["messages.timestamp"] = { $lte: endDate };
    }

    const skip = (page - 1) * limit;

    // جلب المحادثات مع Pagination و Sorting و Projection
    const conversations = await Conversation.find(query)
      .select("userId username messages") // جلب الحقول اللي محتاجينها بس
      .sort({ "messages.timestamp": -1 }) // Sort على مستوى الداتابيز
      .skip(skip)
      .limit(limit)
      .lean();

    // جلب العدد الكلي للمحادثات عشان نعمل Pagination صح
    const totalConversations = await Conversation.countDocuments(query);

    res.status(200).json({
      conversations,
      totalConversations,
      currentPage: page,
      totalPages: Math.ceil(totalConversations / limit),
    });
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    res.status(500).json({ message: "خطأ في جلب المحادثات." });
  }
};

// Delete a user's conversations
exports.deleteUserMessages = async (req, res) => {
  try {
    const botId = req.params.botId;
    const userId = req.params.userId;
    const channelType = req.query.type;

    if (!botId || !userId || !channelType) {
      return res.status(400).json({ message: "معرف البوت أو المستخدم أو القناة غير محدد." });
    }

    await Conversation.deleteMany({ botId, userId, channel: channelType });
    res.status(200).json({ message: "تم حذف محادثات المستخدم بنجاح." });
  } catch (error) {
    console.error("Error in deleteUserMessages:", error.message);
    res.status(500).json({ message: "خطأ في حذف المحادثات." });
  }
};

// Delete all conversations for a bot
exports.deleteAllMessages = async (req, res) => {
  try {
    const botId = req.params.botId;
    const channelType = req.query.type;

    if (!botId || !channelType) {
      return res.status(400).json({ message: "معرف البوت أو القناة غير محدد." });
    }

    await Conversation.deleteMany({ botId, channel: channelType });
    res.status(200).json({ message: "تم حذف جميع المحادثات بنجاح." });
  } catch (error) {
    console.error("Error in deleteAllMessages:", error.message);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
};
