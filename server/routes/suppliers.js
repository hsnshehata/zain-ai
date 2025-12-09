// /server/routes/suppliers.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/suppliersController');

const router = express.Router();

router.get('/:storeId/suppliers', authenticate, ctrl.getSuppliers);
router.get('/:storeId/suppliers/:supplierId', authenticate, ctrl.getSupplier);
router.post('/:storeId/suppliers', authenticate, ctrl.createSupplier);
router.put('/:storeId/suppliers/:supplierId', authenticate, ctrl.updateSupplier);
router.delete('/:storeId/suppliers/:supplierId', authenticate, ctrl.deleteSupplier);
router.get('/:storeId/suppliers/:supplierId/transactions', authenticate, ctrl.getSupplierTransactions);
router.post('/:storeId/suppliers/:supplierId/transactions', authenticate, ctrl.addSupplierTransaction);
router.post('/:storeId/suppliers/:supplierId/invoices', authenticate, ctrl.createPurchaseInvoice);
router.get('/:storeId/suppliers/:supplierId/invoices', authenticate, ctrl.getPurchaseInvoices);
router.get('/:storeId/suppliers/:supplierId/statement', authenticate, ctrl.getSupplierStatement);

module.exports = router;
