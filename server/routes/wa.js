const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { connect, disconnect, status } = require('../controllers/waServiceController');

router.post('/:botId/connect', authenticate, connect);
router.post('/:botId/disconnect', authenticate, disconnect);
router.get('/:botId/status', authenticate, status);

module.exports = router;
