const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/expensesController');

router.get('/:storeId/expenses', authenticate, ctrl.getExpenses);
router.post('/:storeId/expenses', authenticate, ctrl.createExpense);
router.put('/:storeId/expenses/:id', authenticate, ctrl.updateExpense);
router.delete('/:storeId/expenses/:id', authenticate, ctrl.deleteExpense);

module.exports = router;
