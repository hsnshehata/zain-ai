// server/controllers/whatsappController.js
const { processMessage } = require("../botEngine");
const WhatsAppSession = require("../models/WhatsAppSession");
const mongoose = require("mongoose");

// Webhook verification
const verifyWebhook = async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("✅ WhatsApp Webhook verified");
      res.status(200).send(challenge);
    } else {
      console.log("❌ WhatsApp Webhook verification failed");
      res.sendStatus(403);
    }
  } else {
    console.log("❌ Missing verification parameters");
    res.sendStatus(400);
  }
};

// Process incoming WhatsApp messages
const processWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0] &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const messageData = body.entry[0].changes[0].value.messages[0];
        const userId = messageData.from; // WhatsApp user ID
        const messageId = messageData.id; // Unique message ID
        let message = "";
        let isImage = false;
        let isVoice = false;
        let mediaUrl = null;

        // Check message type and extract content
        if (messageData.type === "text") {
          message = messageData.text.body;
        } else if (messageData.type === "image") {
          isImage = true;
          mediaUrl = messageData.image.id; // Get the media ID
        } else if (messageData.type === "audio") {
          isVoice = true;
          mediaUrl = messageData.audio.id; // Get the media ID
        } else {
          console.log(`⚠️ Unsupported message type: ${messageData.type}`);
          return res.sendStatus(200); // Acknowledge but don't process
        }

        // If it's a media message, fetch the media URL
        if (isImage || isVoice) {
          try {
            const session = await WhatsAppSession.findOne({ phoneNumber: userId });
            if (!session) {
              console.log(`❌ No WhatsApp session found for user: ${userId}`);
              return res.sendStatus(200);
            }

            const response = await fetch(
              `https://graph.facebook.com/v20.0/${mediaUrl}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                },
              }
            );
            const mediaData = await response.json();
            if (mediaData.url) {
              mediaUrl = mediaData.url; // Update mediaUrl with the actual URL
              console.log(`📥 Media URL fetched: ${mediaUrl}`);
            } else {
              console.log(`❌ Failed to fetch media URL for ID: ${mediaUrl}`);
              return res.sendStatus(200);
            }
          } catch (err) {
            console.error(`❌ Error fetching media URL: ${err.message}`, err.stack);
            return res.sendStatus(200);
          }
        }

        // Find the bot associated with this WhatsApp number
        const bot = await mongoose.model("Bot").findOne({
          whatsappBusinessAccountId: body.entry[0].changes[0].value.metadata.phone_number_id,
        });

        if (!bot) {
          console.log(
            `❌ No bot found for WhatsApp Business Account ID: ${body.entry[0].changes[0].value.metadata.phone_number_id}`
          );
          return res.sendStatus(200);
        }

        console.log(
          `📬 Processing WhatsApp message: user=${userId}, message=${
            message || "[Media]"
          }, botId=${bot._id}, messageId=${messageId}`
        );

        // Process the message using botEngine
        const reply = await processMessage(
          bot._id,
          userId,
          message || mediaUrl, // Use mediaUrl if message is empty
          isImage,
          isVoice,
          messageId,
          "whatsapp"
        );

        // Send reply back to WhatsApp
        await fetch(
          `https://graph.facebook.com/v20.0/${body.entry[0].changes[0].value.metadata.phone_number_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: userId,
              type: "text",
              text: { body: reply },
            }),
          }
        );

        console.log(`✅ Sent reply to WhatsApp: ${reply}`);
      }
      res.sendStatus(200);
    } else {
      console.log("❌ Invalid WhatsApp webhook payload");
      res.sendStatus(404);
    }
  } catch (err) {
    console.error("❌ Error processing WhatsApp webhook:", err.message, err.stack);
    res.sendStatus(500);
  }
};

module.exports = { verifyWebhook, processWebhook };
