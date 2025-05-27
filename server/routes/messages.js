const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation");
const Bot = require("../models/Bot");
const authenticate = require("../middleware/authenticate");
const request = require("request");
const messagesController = require("../controllers/messagesController");

// دالة لجلب اسم المستخدم من فيسبوك، إنستجرام، أو واتساب
async function getSocialUsername(userId, bot, platform) {
  try {
    let accessToken =
      platform === "facebook"
        ? bot.facebookApiKey
        : platform === "instagram"
        ? bot.instagramApiKey
        : bot.whatsappApiKey;
    let apiUrl =
      platform === "facebook"
        ? "https://graph.facebook.com/v22.0"
        : platform === "instagram"
        ? "https://graph.instagram.com/v22.0"
        : "https://graph.whatsapp.com/v22.0";
    let attempt =
      platform === "facebook"
        ? "فيسبوك (المحاولة الأولى)"
        : platform === "instagram"
        ? "إنستجرام"
        : "واتساب";

    console.log(
      `📋 جلب التوكن لـ ${attempt} | Bot ID: ${bot._id} | Token: ${
        accessToken ? accessToken.slice(0, 10) + "..." : "غير موجود"
      }`
    );

    if (!accessToken) {
      console.error(
        `❌ لم يتم العثور على access token لـ ${attempt} لهذا البوت ${bot._id}`
      );
      if (platform === "facebook") {
        // جرب إنستجرام كمحاولة ثانية
        console.log(`📋 محاولة جلب الاسم باستخدام توكن إنستجرام كبديل...`);
        accessToken = bot.instagramApiKey;
        apiUrl = "https://graph.instagram.com/v22.0";
        attempt = "إنستجرام (المحاولة الثانية)";
        if (!accessToken) {
          console.error(
            `❌ لم يتم العثور على توكن إنستجرام أيضاً لهذا البوت ${bot._id}`
          );
          return platform === "whatsapp"
            ? userId.replace("whatsapp_", "")
            : "مستخدم فيسبوك";
        }
      } else {
        return platform === "whatsapp"
          ? userId.replace("whatsapp_", "")
          : "مستخدم فيسبوك";
      }
    }

    // تنظيف المعرف
    let cleanUserId = userId.replace(
      /^(facebook_|facebook_comment_|instagram_|instagram_comment_|whatsapp_)/,
      ""
    );
    cleanUserId = cleanUserId.replace(/^comment_/, "");
    console.log(
      `📋 جلب اسم المستخدم لـ ${userId}, بعد التنظيف: ${cleanUserId}, المحاولة: ${attempt}`
    );

    // طلب جلب الاسم
    const response = await new Promise((resolve, reject) => {
      request(
        {
          uri:
            platform === "whatsapp"
              ? `${apiUrl}/${bot.whatsappBusinessAccountId}/contacts`
              : `${apiUrl}/${cleanUserId}`,
          qs:
            platform === "whatsapp"
              ? { phone_numbers: cleanUserId, access_token: accessToken }
              : { access_token: accessToken, fields: platform === "whatsapp" ? "phone_number" : "name" },
          method: "GET",
        },
        (err, res, body) => {
          if (err) {
            console.error(
              `❌ خطأ في طلب API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`,
              err.message
            );
            return reject(err);
          }
          resolve(JSON.parse(body));
        }
      );
    });

    if (response.error) {
      console.error(
        `❌ خطأ في استجابة API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`,
        response.error.message,
        response.error
      );
      if (platform === "facebook" && attempt === "فيسبوك (المحاولة الأولى)") {
        // جرب إنستجرام كمحاولة ثانية
        console.log(`📋 محاولة جلب الاسم باستخدام توكن إنستجرام كبديل...`);
        accessToken = bot.instagramApiKey;
        apiUrl = "https://graph.instagram.com/v22.0";
        attempt = "إنستجرام (المحاولة الثانية)";
        if (!accessToken) {
          console.error(
            `❌ لم يتم العثور على توكن إنستجرام لهذا البوت ${bot._id}`
          );
          return "مستخدم فيسبوك";
        }

        const retryResponse = await new Promise((resolve, reject) => {
          request(
            {
              uri: `${apiUrl}/${cleanUserId}`,
              qs: { access_token: accessToken, fields: "name" },
              method: "GET",
            },
            (err, res, body) => {
              if (err) {
                console.error(
                  `❌ خطأ في طلب API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`,
                  err.message
                );
                return reject(err);
              }
              resolve(JSON.parse(body));
            }
          );
        });

        if (retryResponse.error) {
          console.error(
            `❌ خطأ في استجابة API لجلب الاسم لـ ${cleanUserId} في ${attempt}:`,
            retryResponse.error.message,
            retryResponse.error
          );
          return "مستخدم فيسبوك";
        }

        console.log(
          `✅ تم جلب الاسم بنجاح لـ ${cleanUserId} في ${attempt}: ${retryResponse.name}`
        );
        return retryResponse.name || "مستخدم فيسبوك";
      }
      return platform === "whatsapp" ? cleanUserId : "مستخدم فيسبوك";
    }

    console.log(
      `✅ تم جلب الاسم بنجاح لـ ${cleanUserId} في ${attempt}: ${
        platform === "whatsapp" ? response.data[0]?.phone_number : response.name
      }`
    );
    return platform === "whatsapp"
      ? response.data[0]?.phone_number || cleanUserId
      : response.name || "مستخدم فيسبوك";
  } catch (err) {
    console.error(
      `❌ خطأ في جلب اسم المستخدم ${userId} من ${platform}:`,
      err.message,
      err.stack
    );
    return platform === "whatsapp"
      ? userId.replace("whatsapp_", "")
      : "مستخدم فيسبوك";
  }
}

// Get conversations for a bot (using messagesController.getMessages)
router.get("/:botId", authenticate, async (req, res) => {
  try {
    const { botId } = req.params;
    const { type, startDate, endDate, page, limit } = req.query;

    // جلب البوت من قاعدة البيانات
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new Error("البوت غير موجود");
    }

    // استدعاء getMessages من messagesController
    req.params.botId = botId;
    req.query.type = type;
    req.query.startDate = startDate;
    req.query.endDate = endDate;
    req.query.page = page;
    req.query.limit = limit;

    const result = await messagesController.getMessages(req, res);

    // إذا كان هناك استجابة من getMessages، نعدل الـ conversations لإضافة الـ username
    if (result && result.conversations) {
      const conversationsWithUsernames = await Promise.all(
        result.conversations.map(async (conv) => {
          // نجرب نستخدم الـ username الموجود في المحادثة أولاً
          let username = conv.username || conv.userId;
          if (!conv.username) {
            // لو مافيش username مخزن، نجيبه من الـ API
            if (type === "facebook" && bot.facebookApiKey) {
              console.log(`📋 محاولة جلب اسم المستخدم لـ ${conv.userId} من فيسبوك`);
              username = await getSocialUsername(conv.userId, bot, "facebook");
            } else if (type === "instagram" && bot.instagramApiKey) {
              console.log(
                `📋 محاولة جلب اسم المستخدم لـ ${conv.userId} من إنستجرام`
              );
              username = await getSocialUsername(conv.userId, bot, "instagram");
            } else if (type === "whatsapp" && bot.whatsappApiKey) {
              console.log(
                `📋 محاولة جلب اسم المستخدم لـ ${conv.userId} من واتساب`
              );
              username = await getSocialUsername(conv.userId, bot, "whatsapp");
            }
          }
          return { ...conv, username };
        })
      );

      // نعدل الاستجابة لتشمل الـ conversations المعدلة مع بيانات الـ Pagination
      res.status(200).json({
        conversations: conversationsWithUsernames,
        totalConversations: result.totalConversations,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
      });
    }
  } catch (err) {
    console.error("Error fetching conversations:", err.message);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

// Get daily messages for a bot
router.get("/daily/:botId", authenticate, messagesController.getDailyMessages);

// Get social user name
router.get("/social-user/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { botId, platform } = req.query;

    if (!botId || !platform) {
      throw new Error("يرجى تحديد botId وplatform في الطلب");
    }

    if (!["facebook", "instagram", "whatsapp"].includes(platform)) {
      throw new Error("المنصة يجب أن تكون facebook، instagram، أو whatsapp");
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new Error("البوت غير موجود");
    }

    const username = await getSocialUsername(userId, bot, platform);
    res.status(200).json({ name: username });
  } catch (err) {
    console.error("Error fetching social user:", err);
    res.status(500).json({ message: "خطأ في جلب اسم المستخدم" });
  }
});

// Delete a single message
router.delete(
  "/delete-message/:botId/:userId/:messageId",
  authenticate,
  async (req, res) => {
    try {
      const { botId, userId, messageId } = req.params;
      const { type } = req.query;

      let query = { botId, userId };
      if (type === "facebook") {
        query.userId = { $regex: "^(facebook_|facebook_comment_)" };
      } else if (type === "web") {
        query.userId = { $in: ["anonymous", /^web_/] };
      } else if (type === "instagram") {
        query.userId = { $regex: "^(instagram_|instagram_comment_)" };
      } else if (type === "whatsapp") {
        query.userId = { $regex: "^whatsapp_" };
      }

      const conversation = await Conversation.findOne(query);
      if (!conversation) {
        return res.status(404).json({ message: "المحادثة غير موجودة" });
      }

      conversation.messages = conversation.messages.filter(
        (msg) => msg._id.toString() !== messageId
      );
      await conversation.save();

      res.status(200).json({ message: "تم حذف الرسالة بنجاح" });
    } catch (err) {
      console.error("Error deleting message:", err.message);
      res.status(500).json({ message: "خطأ في السيرفر" });
    }
  }
);

// Delete a single conversation by conversationId
router.delete(
  "/delete-conversation/:botId/:conversationId",
  authenticate,
  async (req, res) => {
    try {
      const { botId, conversationId } = req.params;

      const result = await Conversation.deleteOne({ botId, _id: conversationId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "المحادثة غير موجودة" });
      }

      res.status(200).json({ message: "تم حذف المحادثة بنجاح" });
    } catch (err) {
      console.error("Error deleting conversation:", err.message);
      res.status(500).json({ message: "خطأ في السيرفر" });
    }
  }
);

// Delete a user's conversations
router.delete("/delete-user/:botId/:userId", authenticate, messagesController.deleteUserMessages);

// Delete all conversations for a bot
router.delete("/delete-all/:botId", authenticate, messagesController.deleteAllMessages);

// Download all messages
router.get("/download/:botId", authenticate, async (req, res) => {
  try {
    const { botId } = req.params;
    const { type } = req.query;

    let query = { botId };
    if (type === "facebook") {
      query.userId = { $regex: "^(facebook_|facebook_comment_)" };
    } else if (type === "web") {
      query.userId = { $in: ["anonymous", /^web_/] };
    } else if (type === "instagram") {
      query.userId = { $regex: "^(instagram_|instagram_comment_)" };
    } else if (type === "whatsapp") {
      query.userId = { $regex: "^whatsapp_" };
    }

    const conversations = await Conversation.find(query);
    let textContent = "";

    for (const conv of conversations) {
      textContent += `User ID: ${conv.userId}\n`;
      conv.messages.forEach((msg) => {
        textContent += `${
          msg.role === "user" ? "User" : "Bot"
        } (${new Date(msg.timestamp).toLocaleString("ar-EG")}): ${msg.content}\n`;
      });
      textContent += "-------------------------\n";
    }

    res.set("Content-Type", "text/plain");
    res.send(textContent);
  } catch (err) {
    console.error("Error downloading messages:", err.message);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

module.exports = router;
