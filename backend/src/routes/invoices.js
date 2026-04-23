const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, getInvoice, updateInvoice, deleteInvoice } = require('../controllers/invoices');
const { authenticate } = require('../middleware/auth');
const { requireInvoiceWrite } = require('../middleware/finance');

router.use(authenticate);
router.get('/', getInvoices);           // Finance + Sales (own)
router.post('/', requireInvoiceWrite, createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', requireInvoiceWrite, updateInvoice);
router.delete('/:id', requireInvoiceWrite, deleteInvoice);

module.exports = router;
