// /server/routes/sales.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/salesController');

const router = express.Router();

router.post('/:storeId/sales', authenticate, ctrl.createSale);
router.get('/:storeId/sales', authenticate, ctrl.getSales);
router.get('/:storeId/sales/:saleId', authenticate, ctrl.getSale);

module.exports = router;
