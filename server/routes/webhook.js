// server/routes/webhook.js
const express = require('express');
const router = express.Router();
const { handleMessage: handleFacebookMessage } = require('../controllers/facebookController');
const { handleMessage: handleInstagramMessage } = require('../controllers/instagramController');
const { handleMessage: handleWhatsAppMessage, verifyWebhook: verifyWhatsAppWebhook } = require('../controllers/whatsappController');

// Webhook لفيسبوك
router.get('/facebook', (req, res) => {
  const VERIFY_TOKEN = 'hassanshehata';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Facebook Webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Facebook Webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(403);
  }
});

router.post('/facebook', handleFacebookMessage);

// Webhook لإنستجرام
router.get('/instagram', (req, res) => {
  const VERIFY_TOKEN = 'hassanshehata';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Instagram Webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Instagram Webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(403);
  }
});

router.post('/instagram', handleInstagramMessage);

// Webhook لواتساب
router.get('/whatsapp', verifyWhatsAppWebhook);

router.post('/whatsapp', handleWhatsAppMessage);

module.exports = router;
