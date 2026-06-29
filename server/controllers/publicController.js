import Invoice from '../models/Invoice.js';
import { getFreshSignedUrlForInvoicePdf } from '../services/s3.js';
import {
  fetchRazorpayPayment,
  formatRazorpayFailure,
  paidAtFromPaymentEntity
} from '../services/razorpay.js';

const buildPublicInvoicePayload = async (invoice) => {
  let pdfUrl = '';
  if (invoice.pdfS3Key || invoice.pdfUrl) {
    try {
      pdfUrl =
        (await getFreshSignedUrlForInvoicePdf(invoice.pdfUrl, invoice.pdfS3Key)) || '';
    } catch (urlError) {
      console.error('Error generating signed URL:', urlError);
    }
  }

  const razorpayOrderId = invoice.razorpayOrderId || '';
  const paymentMode = razorpayOrderId ? 'order' : 'link';

  return {
    invoice: {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      total: invoice.total,
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      pdfUrl: pdfUrl || '',
      stripePaymentLink: invoice.stripePaymentLink || '',
      paymentMode,
      razorpayOrderId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      razorpayPaymentId: invoice.razorpayPaymentId || '',
      clientId: invoice.clientId,
      freelancerId: {
        name: invoice.freelancerId.name,
        businessName: invoice.freelancerId.businessName,
        logoUrl: invoice.freelancerId.logoUrl
      }
    }
  };
};

// Webhooks don't reach localhost; this keeps dev and slow-webhook cases consistent
export const confirmPaymentFromRedirect = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { razorpayPaymentId } = req.body || {};

    if (!razorpayPaymentId || typeof razorpayPaymentId !== 'string') {
      return res.status(400).json({ message: 'razorpayPaymentId is required' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      const populated = await Invoice.findById(invoiceId)
        .populate('clientId', 'name email phone company address')
        .populate('freelancerId', 'name businessName logoUrl');
      const payload = await buildPublicInvoicePayload(populated);
      return res.json({
        message: 'Invoice already marked paid',
        ...payload
      });
    }

    const payment = await fetchRazorpayPayment(razorpayPaymentId.trim());

    if (payment.status !== 'captured') {
      return res.status(400).json({
        message: `Payment is not complete (status: ${payment.status})`
      });
    }

    const expectedPaise = Math.round(Number(invoice.total) * 100);
    if (Number(payment.amount) !== expectedPaise) {
      return res.status(400).json({ message: 'Payment amount does not match invoice total' });
    }

    const invId = invoice._id.toString();
    const notes = payment.notes || {};
    const notesMatch =
      String(notes.invoiceId || notes.invoice_id || '') === invId;
    const linkMatch =
      payment.payment_link_id &&
      invoice.razorpayPaymentLinkId &&
      payment.payment_link_id === invoice.razorpayPaymentLinkId;
    const orderMatch =
      payment.order_id &&
      invoice.razorpayOrderId &&
      payment.order_id === invoice.razorpayOrderId;

    if (!notesMatch && !linkMatch && !orderMatch) {
      return res.status(400).json({
        message: 'This payment does not belong to this invoice'
      });
    }

    invoice.status = 'paid';
    invoice.razorpayPaymentId = payment.id || '';
    const paidAt = paidAtFromPaymentEntity(payment);
    if (paidAt) invoice.paidAt = paidAt;
    await invoice.save();

    const populated = await Invoice.findById(invoiceId)
      .populate('clientId', 'name email phone company address')
      .populate('freelancerId', 'name businessName logoUrl');

    const payload = await buildPublicInvoicePayload(populated);
    res.json({
      message: 'Payment confirmed',
      ...payload
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    const detail = formatRazorpayFailure(error);
    res.status(400).json({
      message: detail || 'Could not verify payment'
    });
  }
};

export const getInvoiceForPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId)
      .populate('clientId', 'name email phone company address')
      .populate('freelancerId', 'name businessName logoUrl');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'draft') {
      return res.status(403).json({ message: 'This invoice has not been sent yet' });
    }

    const payload = await buildPublicInvoicePayload(invoice);
    res.json(payload);
  } catch (error) {
    console.error('Get invoice for payment error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid invoice ID format' });
    }

    res.status(500).json({
      message: 'Error retrieving invoice',
      error: error.message
    });
  }
};
