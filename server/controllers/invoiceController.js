import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { generateAndUploadInvoicePDF } from '../services/invoicePdfService.js';
import {
  ensureInvoiceRazorpay,
  fetchRazorpayPayment,
  fetchRazorpayPaymentLink,
  paidAtFromPaymentEntity,
  resolvePaidAtForPaymentLink
} from '../services/razorpay.js';
import { getFreshSignedUrlForInvoicePdf } from '../services/s3.js';
import { sendInvoiceEmail, sendOverdueReminderEmail } from '../services/email.js';

const withFreshPdfDownloadUrl = async (invoiceDoc) => {
  if (!invoiceDoc) return null;
  const o = invoiceDoc.toObject ? invoiceDoc.toObject() : { ...invoiceDoc };
  if (o.pdfS3Key || o.pdfUrl) {
    try {
      const fresh = await getFreshSignedUrlForInvoicePdf(o.pdfUrl, o.pdfS3Key);
      if (fresh) o.pdfUrl = fresh;
    } catch (e) {
      console.error('Fresh PDF signed URL:', e);
    }
  }
  delete o.pdfS3Key;
  return o;
};

const calculateTotals = (lineItems, tax, discount) => {
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const subtotalWithTax = subtotal * (1 + tax / 100);
  const total = subtotalWithTax * (1 - discount / 100);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

const normalizeLineItems = (lineItems) => {
  if (!Array.isArray(lineItems)) return [];
  return lineItems.map((item) => ({
    description: String(item.description ?? '').trim(),
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice)
  }));
};

const formatMongooseValidation = (error) => {
  if (!error.errors) return ['Validation failed'];
  return Object.values(error.errors).map((e) => e.message);
};

export const createInvoice = async (req, res) => {
  try {
    const freelancerId = req.userId;
    const { clientId, lineItems: rawLineItems, tax, discount, dueDate, status } = req.body;
    const lineItems = normalizeLineItems(rawLineItems);

    const client = await Client.findOne({ _id: clientId, freelancerId });
    if (!client) {
      return res.status(404).json({
        message: 'Client not found or you do not have permission to create invoice for this client'
      });
    }

    const taxN = tax !== undefined && tax !== '' ? Number(tax) : 0;
    const discountN = discount !== undefined && discount !== '' ? Number(discount) : 0;

    const { subtotal, total } = calculateTotals(
      lineItems,
      Number.isFinite(taxN) ? taxN : 0,
      Number.isFinite(discountN) ? discountN : 0
    );

    const invoice = await Invoice.create({
      freelancerId,
      clientId,
      lineItems,
      subtotal,
      tax: Number.isFinite(taxN) ? taxN : 0,
      discount: Number.isFinite(discountN) ? discountN : 0,
      total,
      dueDate: new Date(dueDate),
      status: status || 'draft'
    });

    if (invoice.status !== 'draft') {
      try {
        const freelancer = await User.findById(freelancerId);
        const { key, signedUrl } = await generateAndUploadInvoicePDF(invoice, client, freelancer);
        invoice.pdfUrl = signedUrl;
        invoice.pdfS3Key = key;
        await invoice.save();
      } catch (pdfError) {
        console.error('PDF generation error (non-blocking):', pdfError);
      }
    }

    await invoice.populate('clientId', 'name email phone company address');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: await withFreshPdfDownloadUrl(invoice)
    });
  } catch (error) {
    console.error('Create invoice error:', error);

    if (error.name === 'ValidationError') {
      const errors = formatMongooseValidation(error);
      return res.status(400).json({ message: errors.join(' '), errors });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message:
          'Duplicate invoice number. If you upgraded from an older version, run in MongoDB: db.invoices.dropIndex("invoiceNumber_1") then restart the server.',
        code: 'DUPLICATE_KEY'
      });
    }

    res.status(500).json({ message: 'Error creating invoice', error: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const freelancerId = req.userId;
    const { status, startDate, endDate } = req.query;

    const query = { freelancerId };

    if (status && ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'declined', 'expired'].includes(status)) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name email phone company')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Invoices retrieved successfully',
      count: invoices.length,
      invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Error retrieving invoices', error: error.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;

    const invoice = await Invoice.findOne({ _id: id, freelancerId })
      .populate('clientId', 'name email phone company address');

    if (!invoice) {
      return res.status(404).json({
        message: 'Invoice not found or you do not have permission to access it'
      });
    }

    // Paid but paidAt missing — backfill from Razorpay API
    if (invoice.status === 'paid' && !invoice.paidAt) {
      try {
        if (invoice.razorpayPaymentId && String(invoice.razorpayPaymentId).startsWith('pay_')) {
          const payment = await fetchRazorpayPayment(String(invoice.razorpayPaymentId).trim());
          const paidAt = paidAtFromPaymentEntity(payment);
          if (paidAt) invoice.paidAt = paidAt;
          await invoice.save();
        } else if (invoice.razorpayPaymentLinkId && String(invoice.razorpayPaymentLinkId).startsWith('plink_')) {
          const pl = await fetchRazorpayPaymentLink(String(invoice.razorpayPaymentLinkId).trim());
          const paidAt = await resolvePaidAtForPaymentLink(pl);
          if (paidAt) invoice.paidAt = paidAt;
          if (pl.payment_id && !invoice.razorpayPaymentId) {
            invoice.razorpayPaymentId = pl.payment_id;
          }
          await invoice.save();
        }
      } catch (e) {
        console.warn('Backfill paidAt from Razorpay:', e?.message || e);
      }
    }

    res.json({
      message: 'Invoice retrieved successfully',
      invoice: await withFreshPdfDownloadUrl(invoice)
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid invoice ID format' });
    }
    res.status(500).json({ message: 'Error retrieving invoice', error: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;
    const { clientId, lineItems: rawLineItems, tax, discount, dueDate, status } = req.body;
    const lineItems =
      rawLineItems !== undefined && rawLineItems !== null
        ? normalizeLineItems(rawLineItems)
        : undefined;

    const invoice = await Invoice.findOne({ _id: id, freelancerId });

    if (!invoice) {
      return res.status(404).json({
        message: 'Invoice not found or you do not have permission to update it'
      });
    }

    if (clientId && clientId.toString() !== invoice.clientId.toString()) {
      const client = await Client.findOne({ _id: clientId, freelancerId });
      if (!client) {
        return res.status(404).json({
          message: 'Client not found or you do not have permission to use this client'
        });
      }
      invoice.clientId = clientId;
    }

    if (lineItems) {
      invoice.lineItems = lineItems;
      const { subtotal, total } = calculateTotals(
        lineItems,
        tax !== undefined ? tax : invoice.tax,
        discount !== undefined ? discount : invoice.discount
      );
      invoice.subtotal = subtotal;
      invoice.total = total;
    }

    if (tax !== undefined) {
      invoice.tax = tax;
      const { total } = calculateTotals(invoice.lineItems, tax, invoice.discount);
      invoice.total = total;
    }

    if (discount !== undefined) {
      invoice.discount = discount;
      const { total } = calculateTotals(invoice.lineItems, invoice.tax, discount);
      invoice.total = total;
    }

    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (status) invoice.status = status;

    await invoice.save();

    if (invoice.status !== 'draft' && (invoice.pdfUrl || invoice.pdfS3Key)) {
      try {
        const client = await Client.findById(invoice.clientId);
        const freelancer = await User.findById(freelancerId);
        const { key, signedUrl } = await generateAndUploadInvoicePDF(invoice, client, freelancer);
        invoice.pdfUrl = signedUrl;
        invoice.pdfS3Key = key;
        await invoice.save();
      } catch (pdfError) {
        console.error('PDF regeneration error (non-blocking):', pdfError);
      }
    }

    await invoice.populate('clientId', 'name email phone company address');

    res.json({
      message: 'Invoice updated successfully',
      invoice: await withFreshPdfDownloadUrl(invoice)
    });
  } catch (error) {
    console.error('Update invoice error:', error);

    if (error.name === 'ValidationError') {
      const errors = formatMongooseValidation(error);
      return res.status(400).json({ message: errors.join(' '), errors });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message:
          'Duplicate invoice number. If you upgraded from an older version, run in MongoDB: db.invoices.dropIndex("invoiceNumber_1") then restart the server.',
        code: 'DUPLICATE_KEY'
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid invoice ID format' });
    }

    res.status(500).json({ message: 'Error updating invoice', error: error.message });
  }
};

export const sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;

    const invoice = await Invoice.findOne({ _id: id, freelancerId })
      .populate('clientId', 'name email phone company address');

    if (!invoice) {
      return res.status(404).json({
        message: 'Invoice not found or you do not have permission to send it'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot send an invoice that is already paid' });
    }

    const freelancer = await User.findById(freelancerId);

    if (!invoice.pdfUrl && !invoice.pdfS3Key) {
      const { key, signedUrl } = await generateAndUploadInvoicePDF(invoice, invoice.clientId, freelancer);
      invoice.pdfUrl = signedUrl;
      invoice.pdfS3Key = key;
    }

    const { paymentUrlForEmail } = await ensureInvoiceRazorpay(invoice, invoice.clientId);

    invoice.status = 'sent';
    await invoice.save();

    const publicInvoiceUrl = `${process.env.CLIENT_URL}/invoice/${invoice._id}/pay`;
    const businessName = freelancer.businessName || freelancer.name || '';
    const emailResult = await sendInvoiceEmail({
      to: invoice.clientId.email,
      clientName: invoice.clientId.name,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      paymentUrl: paymentUrlForEmail,
      publicInvoiceUrl,
      businessName
    });

    let message;
    if (emailResult.sent) {
      message = 'Invoice sent successfully';
    } else if (emailResult.skipped) {
      message = 'Invoice sent (configure SMTP to email the client automatically)';
    } else if (emailResult.error) {
      message = `Payment link is ready, but email failed: ${emailResult.error}. Fix SMTP in server .env or share the link manually.`;
    } else {
      message = 'Invoice sent successfully';
    }

    res.json({
      message,
      invoice: await withFreshPdfDownloadUrl(invoice),
      emailSent: Boolean(emailResult.sent),
      emailError: emailResult.error || null
    });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ message: 'Error sending invoice', error: error.message });
  }
};

export const markOverdue = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;

    const invoice = await Invoice.findOne({ _id: id, freelancerId })
      .populate('clientId', 'name email phone company address');

    if (!invoice) {
      return res.status(404).json({
        message: 'Invoice not found or you do not have permission to update it'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot mark a paid invoice as overdue' });
    }

    if (['cancelled', 'declined', 'expired'].includes(invoice.status)) {
      return res.status(400).json({ message: 'Resend the invoice first to create a new payment link.' });
    }

    invoice.status = 'overdue';
    await invoice.save();

    res.json({
      message: 'Invoice marked as overdue',
      invoice: await withFreshPdfDownloadUrl(invoice)
    });
  } catch (error) {
    console.error('Mark overdue error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid invoice ID format' });
    }
    res.status(500).json({ message: 'Error marking invoice as overdue', error: error.message });
  }
};

export const sendOverdueReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;

    const invoice = await Invoice.findOne({ _id: id, freelancerId })
      .populate('clientId', 'name email phone company address');

    if (!invoice) {
      return res.status(404).json({
        message: 'Invoice not found or you do not have permission to send reminder'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot send reminder for a paid invoice' });
    }

    if (['cancelled', 'declined', 'expired'].includes(invoice.status)) {
      return res.status(400).json({ message: 'Resend the invoice first to issue a new payment link.' });
    }

    if (invoice.status !== 'overdue') {
      invoice.status = 'overdue';
      await invoice.save();
    }

    const freelancer = await User.findById(freelancerId);
    const { paymentUrlForEmail } = await ensureInvoiceRazorpay(invoice, invoice.clientId);
    await invoice.save();

    const publicInvoiceUrl = `${process.env.CLIENT_URL}/invoice/${invoice._id}/pay`;
    const businessName = freelancer.businessName || freelancer.name || '';
    const emailResult = await sendOverdueReminderEmail({
      to: invoice.clientId.email,
      clientName: invoice.clientId.name,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      paymentUrl: paymentUrlForEmail,
      publicInvoiceUrl,
      businessName
    });

    let reminderMsg = 'Reminder email sent';
    if (emailResult.skipped) {
      reminderMsg = 'Invoice marked overdue (configure SMTP to email a reminder)';
    } else if (emailResult.error) {
      reminderMsg = `Overdue saved, but email failed: ${emailResult.error}`;
    }

    res.json({
      message: reminderMsg,
      invoice: await withFreshPdfDownloadUrl(invoice),
      emailSent: Boolean(emailResult.sent),
      emailError: emailResult.error || null
    });
  } catch (error) {
    console.error('Send overdue reminder error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid invoice ID format' });
    }
    res.status(500).json({ message: 'Error sending overdue reminder', error: error.message });
  }
};
