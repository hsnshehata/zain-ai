// server/controllers/whatsappController.js
const { processMessage } = require("../botEngine");
const WhatsAppSession = require("../models/WhatsAppSession");
const mongoose = require("mongoose");

// Webhook verification
const verifyWebhook = async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const logger = require('../logger');

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      logger.info('whatsapp_webhook_verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('whatsapp_webhook_verify_failed');
      res.sendStatus(403);
    }
  } else {
    logger.warn('whatsapp_webhook_missing_params');
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
        const logger = require('../logger');
        logger.info('whatsapp_message_data', { data: messageData });

        const userId = messageData.from; // WhatsApp user ID
        const messageId = messageData.id; // Unique message ID
        let message = "";
        let isImage = false;
        let isVoice = false;
        let mediaUrl = null;

        // Check message type and extract content
        logger.info('whatsapp_message_type', { type: messageData.type });
        if (messageData.type === "text") {
          message = messageData.text.body;
          logger.info('whatsapp_text_message', { message });
        } else if (messageData.type === "image") {
          isImage = true;
          mediaUrl = messageData.image.id; // Get the media ID
          logger.info('whatsapp_image_message', { mediaUrl });
        } else if (messageData.type === "audio") {
          isVoice = true;
          mediaUrl = messageData.audio.id; // Get the media ID
          logger.info('whatsapp_audio_message', { mediaUrl });
        } else {
          logger.warn('whatsapp_message_unsupported', { type: messageData.type });
          return res.sendStatus(200); // Acknowledge but don't process
        }

        // If it's a media message, fetch the media URL
        if (isImage || isVoice) {
          try {
            logger.info('whatsapp_fetch_media_url', { mediaUrl });
            const response = await fetch(
              `https://graph.facebook.com/v20.0/${mediaUrl}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                },
              }
            );
            const mediaData = await response.json();
            logger.info('whatsapp_media_fetch_response', { mediaData });
            if (mediaData.url) {
              mediaUrl = mediaData.url; // Update mediaUrl with the actual URL
              logger.info('whatsapp_media_url_fetched', { mediaUrl });
            } else {
              logger.warn('whatsapp_media_url_fetch_failed', { mediaUrl });
              return res.sendStatus(200);
            }
          } catch (err) {
            logger.error('whatsapp_media_url_error', { err: err.message, stack: err.stack });
            return res.sendStatus(200);
          }
        }

        // Find the bot associated with this WhatsApp number
        const bot = await mongoose.model("Bot").findOne({
          whatsappBusinessAccountId: body.entry[0].changes[0].value.metadata.phone_number_id,
        });

        if (!bot) {
          logger.warn('whatsapp_bot_not_found', { phoneNumberId: body.entry[0].changes[0].value.metadata.phone_number_id });
          return res.sendStatus(200);
        }

        logger.info('whatsapp_processing', { userId, botId: bot._id, messageId, isImage, isVoice });

        // Process the message using botEngine
        const reply = await processMessage(
          bot._id,
          userId,
          message || mediaUrl, // Use mediaUrl if message is empty
          isImage,
          isVoice,
          messageId,
          "whatsapp",
          mediaUrl
        );

        if (reply === null) {
          logger.info('whatsapp_muted', { userId });
          return res.sendStatus(200);
        }

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

        logger.info('whatsapp_reply_sent', { userId, botId, reply });
      }
      res.sendStatus(200);
    } else {
      logger.warn('whatsapp_invalid_payload');
      res.sendStatus(404);
    }
  } catch (err) {
    logger.error('whatsapp_webhook_error', { err: err.message, stack: err.stack });
    res.sendStatus(500);
  }
};

module.exports = { verifyWebhook, processWebhook };
