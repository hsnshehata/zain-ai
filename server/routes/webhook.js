// server/routes/webhook.js
const express = require('express');
const router = express.Router();
const { handleMessage: handleFacebookMessage } = require('../controllers/facebookController');
const { handleMessage: handleInstagramMessage, verifyWebhook: verifyInstagramWebhook } = require('../controllers/instagramController');
const { processWebhook: handleWhatsAppMessage, verifyWebhook: verifyWhatsAppWebhook } = require('../controllers/whatsappController');
// Webhook لفيسبوك
router.get('/facebook', (req, res) => {
  const VERIFY_TOKEN = 'hassanshehata';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const logger = require('../logger');
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('facebook_webhook_verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('facebook_webhook_verify_failed');
      res.sendStatus(403);
    }
  } else {
    logger.warn('facebook_webhook_missing_params');
    res.sendStatus(403);
  }
});

router.post('/facebook', handleFacebookMessage);

// Webhook لإنستجرام
router.get('/instagram', verifyInstagramWebhook);

router.post('/instagram', handleInstagramMessage);

// Webhook لواتساب
router.get('/whatsapp', (req, res) => {
  const VERIFY_TOKEN = 'hassanshehata';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const logger = require('../logger');
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('whatsapp_webhook_verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('whatsapp_webhook_verify_failed');
      res.sendStatus(403);
    }
  } else {
    logger.warn('whatsapp_webhook_missing_params');
    res.sendStatus(403);
  }
});

router.post('/whatsapp', handleWhatsAppMessage);

module.exports = router;
