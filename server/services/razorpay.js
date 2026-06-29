import Razorpay from 'razorpay';

// Razorpay SDK throws plain objects { statusCode, error }, not Error — err.message is often undefined
export const formatRazorpayFailure = (err) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string') return err.message;

  const apiErr = err.error;
  if (apiErr && typeof apiErr === 'object') {
    const parts = [apiErr.description, apiErr.message, apiErr.code, apiErr.field].filter(Boolean);
    if (parts.length) return parts.join(' — ');
  }

  if (err.response?.data?.error) {
    const e = err.response.data.error;
    if (typeof e === 'object') {
      return e.description || e.message || JSON.stringify(e);
    }
  }

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const fetchRazorpayPayment = async (paymentId) => {
  return razorpay.payments.fetch(paymentId);
};

export const fetchRazorpayPaymentLink = async (plinkId) => {
  return razorpay.paymentLink.fetch(plinkId);
};

// Razorpay uses Unix seconds; some payloads use ms — normalize to Date
export const dateFromRazorpayUnix = (raw) => {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms);
};

export const paidAtFromPaymentEntity = (payment) => {
  if (!payment) return null;
  const captured = dateFromRazorpayUnix(payment.captured_at);
  if (captured) return captured;
  return dateFromRazorpayUnix(payment.created_at);
};

export const paidAtFromPaymentLinkEntity = (paymentLink) => {
  if (!paymentLink) return null;
  return dateFromRazorpayUnix(paymentLink.paid_at);
};

export const resolvePaidAtForPaymentLink = async (paymentLink) => {
  const fromLink = paidAtFromPaymentLinkEntity(paymentLink);
  if (fromLink) return fromLink;
  const pid = paymentLink?.payment_id;
  if (!pid || typeof pid !== 'string') return null;
  try {
    const payment = await fetchRazorpayPayment(pid.trim());
    return paidAtFromPaymentEntity(payment);
  } catch {
    return null;
  }
};

export const needsPaymentLinkRegeneration = (url) => {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  return u.includes('rzp.io/i/test');
};

export const getPaymentLinkMaxInr = () =>
  Number(process.env.PAYMENT_LINK_MAX_INR ?? 29000);

const baseClientUrl = () => (process.env.CLIENT_URL || '').replace(/\/$/, '');

export const createOrderForInvoice = async (amountRupees, invoiceId) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID?.trim() || !process.env.RAZORPAY_KEY_SECRET?.trim()) {
      throw new Error('Razorpay keys missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server .env');
    }

    const amountInPaise = Math.round(Number(amountRupees) * 100);
    // Receipt must be unique per order — resend invoice = new order
    const receipt = `inv_${String(invoiceId)}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: { invoiceId: String(invoiceId) }
    });

    return { orderId: order.id };
  } catch (error) {
    const detail = formatRazorpayFailure(error);
    console.error('Error creating Razorpay Order:', detail, error);
    throw new Error(`Failed to create Razorpay order: ${detail}`);
  }
};

// Payment Links for small amounts; Orders for totals ≥ PAYMENT_LINK_MAX_INR
export const ensureInvoiceRazorpay = async (invoice, client) => {
  const total = Number(invoice.total);
  if (Number.isNaN(total) || total < 0) {
    throw new Error('Invalid invoice total');
  }

  const maxInr = getPaymentLinkMaxInr();
  const publicPayUrl = `${baseClientUrl()}/invoice/${invoice._id}/pay`;

  if (total >= maxInr) {
    invoice.stripePaymentLink = '';
    invoice.razorpayPaymentLinkId = '';
    const { orderId } = await createOrderForInvoice(total, invoice._id.toString());
    invoice.razorpayOrderId = orderId;
    return { paymentUrlForEmail: publicPayUrl, mode: 'order' };
  }

  invoice.razorpayOrderId = '';
  const staleStatuses = ['cancelled', 'expired', 'declined'];
  const linkIsStale =
    needsPaymentLinkRegeneration(invoice.stripePaymentLink) ||
    staleStatuses.includes(invoice.status);
  if (linkIsStale) {
    const link = await createPaymentLink(total, invoice._id.toString(), client.email, client.name);
    invoice.stripePaymentLink = link.shortUrl;
    invoice.razorpayPaymentLinkId = link.id;
  }

  return {
    paymentUrlForEmail: invoice.stripePaymentLink || publicPayUrl,
    mode: 'link'
  };
};

export const createPaymentLink = async (amount, invoiceId, clientEmail, clientName = '') => {
  try {
    if (!process.env.RAZORPAY_KEY_ID?.trim() || !process.env.RAZORPAY_KEY_SECRET?.trim()) {
      throw new Error('Razorpay keys missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server .env');
    }

    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      reference_id: invoiceId.toString(),
      description: `Payment for Invoice ${invoiceId}`,
      notes: { invoiceId: invoiceId.toString() },
      customer: {
        name: clientName || 'Customer',
        email: clientEmail
      },
      callback_url: `${process.env.CLIENT_URL}/invoice/${invoiceId}/pay?success=true`,
      callback_method: 'get',
      notify: {
        sms: false,
        // Set RAZORPAY_NOTIFY_EMAIL=true to also send Razorpay's own email
        email: process.env.RAZORPAY_NOTIFY_EMAIL === 'true'
      }
    };

    const paymentLink = await razorpay.paymentLink.create(options);
    return { shortUrl: paymentLink.short_url, id: paymentLink.id };
  } catch (error) {
    const detail = formatRazorpayFailure(error);
    console.error('Error creating Razorpay Payment Link:', detail, error);
    throw new Error(`Failed to create payment link: ${detail}`);
  }
};
