import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getInvoiceForPayment,
  confirmPaymentFromRedirect
} from '../controllers/publicController.js';

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/invoice/:invoiceId', publicLimiter, getInvoiceForPayment);
router.post('/invoice/:invoiceId/confirm-payment', publicLimiter, confirmPaymentFromRedirect);

export default router;
