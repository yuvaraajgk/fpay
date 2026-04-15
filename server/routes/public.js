import express from 'express';
import {
  getInvoiceForPayment,
  confirmPaymentFromRedirect
} from '../controllers/publicController.js';

const router = express.Router();

// POST /api/public/invoice/:invoiceId/confirm-payment — verify Razorpay payment after redirect (esp. when webhooks cannot reach localhost)
router.post('/invoice/:invoiceId/confirm-payment', confirmPaymentFromRedirect);

// GET /api/public/invoice/:invoiceId - Get invoice details for payment page
router.get('/invoice/:invoiceId', getInvoiceForPayment);

export default router;
