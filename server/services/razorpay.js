import Razorpay from 'razorpay';

/**
 * Razorpay's Node SDK throws a plain object `{ statusCode, error }` from API errors,
 * not an Error — so `err.message` is often undefined.
 */
export const formatRazorpayFailure = (err) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string') return err.message;

  const apiErr = err.error;
  if (apiErr && typeof apiErr === 'object') {
    const parts = [apiErr.description, apiErr.message, apiErr.code, apiErr.field]
      .filter(Boolean);
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

/** Fetch a payment by id (used to confirm status after redirect when webhooks are unavailable). */
export const fetchRazorpayPayment = async (paymentId) => {
  return razorpay.payments.fetch(paymentId);
};

/** Fetch payment link entity (paid_at, payment_id) for backfilling invoice.paidAt */
export const fetchRazorpayPaymentLink = async (plinkId) => {
  return razorpay.paymentLink.fetch(plinkId);
};

/**
 * Razorpay usually sends Unix seconds; some payloads use ms — normalize to Date.
 * Returns null if missing or invalid (never "now" — that was misleading paid-on times).
 */
export const dateFromRazorpayUnix = (raw) => {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms);
};

/** Payment capture time when present; else payment creation time */
export const paidAtFromPaymentEntity = (payment) => {
  if (!payment) return null;
  const captured = dateFromRazorpayUnix(payment.captured_at);
  if (captured) return captured;
  return dateFromRazorpayUnix(payment.created_at);
};

/** Payment Link uses paid_at (seconds) when the link is fully paid */
export const paidAtFromPaymentLinkEntity = (paymentLink) => {
  if (!paymentLink) return null;
  return dateFromRazorpayUnix(paymentLink.paid_at);
};

/**
 * Prefer link paid_at; if missing, fetch the payment (e.g. webhook payload omitted paid_at).
 */
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

/** Seed / fake links that are not real Razorpay Payment Links */
export const needsPaymentLinkRegeneration = (url) => {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  return u.includes('rzp.io/i/test');
};

/** Invoices at or above this total (INR) use Razorpay Orders — Payment Links often cap around ₹30k. */
export const getPaymentLinkMaxInr = () =>
  Number(process.env.PAYMENT_LINK_MAX_INR ?? 29000);

const baseClientUrl = () => (process.env.CLIENT_URL || '').replace(/\/$/, '');

/**
 * Create a Razorpay Order (higher amount limits than Payment Links for many accounts).
 */
export const createOrderForInvoice = async (amountRupees, invoiceId) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID?.trim() || !process.env.RAZORPAY_KEY_SECRET?.trim()) {
      throw new Error(
        'Razorpay keys missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server .env'
      );
    }

    const amountInPaise = Math.round(Number(amountRupees) * 100);
    // Receipt must be unique per order (resend invoice = new order)
    const receipt = `inv_${String(invoiceId)}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        invoiceId: String(invoiceId)
      }
    });

    return { orderId: order.id };
  } catch (error) {
    const detail = formatRazorpayFailure(error);
    console.error('Error creating Razorpay Order:', detail, error);
    throw new Error(`Failed to create Razorpay order: ${detail}`);
  }
};

/**
 * Payment Links for small amounts; Orders for totals ≥ PAYMENT_LINK_MAX_INR (default 29000).
 * Mutates invoice fields; caller must save.
 */
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
    return {
      paymentUrlForEmail: publicPayUrl,
      mode: 'order'
    };
  }

  invoice.razorpayOrderId = '';
  let pl = invoice.stripePaymentLink;
  if (needsPaymentLinkRegeneration(pl)) {
    const link = await createPaymentLink(
      total,
      invoice._id.toString(),
      client.email,
      client.name
    );
    invoice.stripePaymentLink = link.shortUrl;
    invoice.razorpayPaymentLinkId = link.id;
  }

  return {
    paymentUrlForEmail: invoice.stripePaymentLink || publicPayUrl,
    mode: 'link'
  };
};

/**
 * Create a Razorpay Payment Link for an invoice.
 * Money settles in the startup's Razorpay account (not "in-app" platform billing).
 * @param {number} amount - Amount in rupees (will be converted to paise)
 * @param {string} invoiceId - Invoice ID for reference_id
 * @param {string} clientEmail - Client email
 * @param {string} clientName - Client name
 * @returns {Promise<{ shortUrl: string, id: string }>}
 */
export const createPaymentLink = async (amount, invoiceId, clientEmail, clientName = '') => {
  try {
    if (!process.env.RAZORPAY_KEY_ID?.trim() || !process.env.RAZORPAY_KEY_SECRET?.trim()) {
      throw new Error(
        'Razorpay keys missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server .env'
      );
    }

    // Convert rupees to paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      reference_id: invoiceId.toString(),
      description: `Payment for Invoice ${invoiceId}`,
      notes: {
        invoiceId: invoiceId.toString()
      },
      customer: {
        name: clientName || 'Customer',
        email: clientEmail
      },
      callback_url: `${process.env.CLIENT_URL}/invoice/${invoiceId}/pay?success=true`,
      callback_method: 'get',
      notify: {
        sms: false,
        // App sends its own email with the link; set RAZORPAY_NOTIFY_EMAIL=true to also use Razorpay's email
        email: process.env.RAZORPAY_NOTIFY_EMAIL === 'true'
      }
    };

    const paymentLink = await razorpay.paymentLink.create(options);

    return {
      shortUrl: paymentLink.short_url,
      id: paymentLink.id
    };
  } catch (error) {
    const detail = formatRazorpayFailure(error);
    console.error('Error creating Razorpay Payment Link:', detail, error);
    throw new Error(`Failed to create payment link: ${detail}`);
  }
};
