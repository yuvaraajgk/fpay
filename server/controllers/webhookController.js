import crypto from 'crypto';
import Invoice from '../models/Invoice.js';
import {
  paidAtFromPaymentEntity,
  resolvePaidAtForPaymentLink
} from '../services/razorpay.js';

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Handle Razorpay webhook events
 * @param {Object} req - Express request object (req.body must be raw for signature verification)
 * @param {Object} res - Express response object
 */
export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    console.error('Webhook signature missing');
    return res.status(400).send('Webhook Error: Missing signature');
  }

  // Verify webhook signature using HMAC SHA256 (req.body is Buffer when using express.raw())
  const body = req.body;
  const bodyString = Buffer.isBuffer(body) ? body.toString('utf8') : (typeof body === 'string' ? body : JSON.stringify(body));
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyString)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('Webhook signature verification failed');
    return res.status(400).send('Webhook Error: Invalid signature');
  }

  try {
    const payload = Buffer.isBuffer(body)
      ? JSON.parse(body.toString('utf8'))
      : typeof body === 'string' ? JSON.parse(body) : body;
    const event = payload.event;

    switch (event) {
      case 'payment_link.paid':
        await handlePaymentLinkPaid(payload.payload.payment_link.entity);
        break;

      case 'payment_link.cancelled':
        await handlePaymentLinkCancelled(payload.payload.payment_link.entity);
        break;

      case 'payment_link.expired':
        await handlePaymentLinkExpired(payload.payload.payment_link.entity);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(payload.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payload.payment.entity);
        break;

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    res.status(200).json({ error: error.message });
  }
};

/**
 * Handle payment_link.paid event
 * @param {Object} paymentLink - Payment link entity from webhook
 */
const handlePaymentLinkPaid = async (paymentLink) => {
  try {
    const invoiceId = paymentLink.reference_id;

    if (!invoiceId) {
      console.error('No reference_id (invoiceId) found in payment link');
      return;
    }

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      console.error(`Invoice not found: ${invoiceId}`);
      return;
    }

    if (paymentLink.id && !invoice.razorpayPaymentLinkId) {
      invoice.razorpayPaymentLinkId = paymentLink.id;
    }

    if (invoice.status !== 'paid') {
      invoice.status = 'paid';
      if (paymentLink.payment_id) {
        invoice.razorpayPaymentId = paymentLink.payment_id;
      }
      const paidAt = await resolvePaidAtForPaymentLink(paymentLink);
      if (paidAt) invoice.paidAt = paidAt;
      await invoice.save();
      console.log(`Invoice ${invoiceId} marked as paid`);
    } else if (!invoice.paidAt) {
      // Already PAID (e.g. payment.captured arrived first) — still attach date / payment id
      if (paymentLink.payment_id) {
        invoice.razorpayPaymentId = invoice.razorpayPaymentId || paymentLink.payment_id;
      }
      const paidAt = await resolvePaidAtForPaymentLink(paymentLink);
      if (paidAt) invoice.paidAt = paidAt;
      await invoice.save();
      console.log(`Invoice ${invoiceId} paidAt backfilled from payment_link.paid`);
    }
  } catch (error) {
    console.error('Error handling payment_link.paid:', error);
    throw error;
  }
};

const handlePaymentLinkCancelled = async (entity) => {
  try {
    const invoiceId = entity.reference_id;
    if (!invoiceId) return;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.status === 'paid' || invoice.status === 'draft') return;
    invoice.status = 'cancelled';
    await invoice.save();
    console.log(`Invoice ${invoiceId} marked cancelled (payment link cancelled)`);
  } catch (error) {
    console.error('Error handling payment_link.cancelled:', error);
  }
};

const handlePaymentLinkExpired = async (entity) => {
  try {
    const invoiceId = entity.reference_id;
    if (!invoiceId) return;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.status === 'paid' || invoice.status === 'draft') return;
    invoice.status = 'expired';
    await invoice.save();
    console.log(`Invoice ${invoiceId} marked expired (payment link expired)`);
  } catch (error) {
    console.error('Error handling payment_link.expired:', error);
  }
};

/**
 * Customer payment attempt failed (card declined, etc.). Maps to invoice status declined.
 */
const handlePaymentFailed = async (payment) => {
  try {
    const notes = payment.notes || {};
    const fromNotes = notes.invoiceId || notes.invoice_id;
    const plinkId = payment.payment_link_id;
    const orderId = payment.order_id;

    let invoice = null;
    if (orderId) {
      invoice = await Invoice.findOne({ razorpayOrderId: orderId });
    }
    if (!invoice && plinkId) {
      invoice = await Invoice.findOne({ razorpayPaymentLinkId: plinkId });
    }
    if (!invoice && fromNotes) {
      invoice = await Invoice.findById(fromNotes);
    }

    if (!invoice || invoice.status === 'paid' || invoice.status === 'draft') return;

    invoice.status = 'declined';
    await invoice.save();
    console.log(`Invoice ${invoice._id} marked declined (payment failed)`);
  } catch (error) {
    console.error('Error handling payment.failed:', error);
  }
};

/**
 * Handle payment.captured event (fallback - payment links may trigger this)
 * @param {Object} payment - Payment entity from webhook
 */
const handlePaymentCaptured = async (payment) => {
  try {
    const orderId = payment.order_id;
    if (orderId) {
      const byOrder = await Invoice.findOne({ razorpayOrderId: orderId });
      if (byOrder) {
        if (byOrder.status !== 'paid') {
          byOrder.status = 'paid';
          if (payment.id) byOrder.razorpayPaymentId = payment.id;
          const paidAt = paidAtFromPaymentEntity(payment);
          if (paidAt) byOrder.paidAt = paidAt;
          await byOrder.save();
          console.log(`Invoice ${byOrder._id} marked paid (order ${orderId})`);
        } else if (!byOrder.paidAt) {
          if (payment.id) byOrder.razorpayPaymentId = byOrder.razorpayPaymentId || payment.id;
          const paidAt = paidAtFromPaymentEntity(payment);
          if (paidAt) byOrder.paidAt = paidAt;
          await byOrder.save();
        }
        return;
      }
    }

    // Payment Link flows often omit order_id and notes on the payment entity — match by link id
    const plinkId = payment.payment_link_id;
    if (plinkId) {
      const byPlink = await Invoice.findOne({ razorpayPaymentLinkId: plinkId });
      if (byPlink) {
        if (byPlink.status !== 'paid') {
          byPlink.status = 'paid';
          if (payment.id) byPlink.razorpayPaymentId = payment.id;
          const paidAt = paidAtFromPaymentEntity(payment);
          if (paidAt) byPlink.paidAt = paidAt;
          await byPlink.save();
          console.log(`Invoice ${byPlink._id} marked paid (payment_link ${plinkId})`);
        } else if (!byPlink.paidAt) {
          if (payment.id) byPlink.razorpayPaymentId = byPlink.razorpayPaymentId || payment.id;
          const paidAt = paidAtFromPaymentEntity(payment);
          if (paidAt) byPlink.paidAt = paidAt;
          await byPlink.save();
        }
        return;
      }
    }

    const notes = payment.notes || {};
    const invoiceId = notes.invoiceId || notes.invoice_id;

    if (!invoiceId) {
      return;
    }

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return;
    }

    if (invoice.status !== 'paid') {
      invoice.status = 'paid';
      if (payment.id) invoice.razorpayPaymentId = payment.id;
      const paidAt = paidAtFromPaymentEntity(payment);
      if (paidAt) invoice.paidAt = paidAt;
      await invoice.save();
      console.log(`Invoice ${invoiceId} marked as paid (payment.captured)`);
    } else if (!invoice.paidAt) {
      if (payment.id) invoice.razorpayPaymentId = invoice.razorpayPaymentId || payment.id;
      const paidAt = paidAtFromPaymentEntity(payment);
      if (paidAt) invoice.paidAt = paidAt;
      await invoice.save();
    }
  } catch (error) {
    console.error('Error handling payment.captured:', error);
  }
};
