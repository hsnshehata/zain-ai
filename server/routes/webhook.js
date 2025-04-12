const express = require('express');
const router = express.Router();
const { handleMessage } = require('../controllers/facebookController');

router.get('/facebook', (req, res) => {
  const VERIFY_TOKEN = 'hassanshehata';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(403);
  }
});

router.post('/facebook', handleMessage);

module.exports = router;
