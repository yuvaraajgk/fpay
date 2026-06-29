import nodemailer from 'nodemailer';

const truthy = (v) => v === '1' || v === 'true' || v === true;

const smtpPass = () =>
  typeof process.env.SMTP_PASS === 'string'
    ? process.env.SMTP_PASS.replace(/\s+/g, '')
    : '';

const isEmailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      smtpPass() &&
      process.env.EMAIL_FROM
  );

let transporter;

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = truthy(process.env.SMTP_SECURE);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass()
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  }
  return transporter;
};

const formatInr = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);

export const sendInvoiceEmail = async ({
  to,
  clientName,
  invoiceNumber,
  total,
  paymentUrl,
  publicInvoiceUrl,
  businessName
}) => {
  const t = getTransporter();
  if (!t) {
    console.warn(
      '[email] SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM). Invoice was marked sent but no email was delivered.'
    );
    return { sent: false, skipped: true };
  }

  const from = process.env.EMAIL_FROM;
  const subject = `Invoice ${invoiceNumber} from ${businessName || 'your vendor'}`;
  const text = [
    `Hi ${clientName || 'there'},`,
    '',
    `You have a new invoice ${invoiceNumber} for ${formatInr(total)}.`,
    '',
    `Pay securely (money goes directly to ${businessName || 'the business'} via Razorpay):`,
    paymentUrl,
    '',
    `View invoice details:`,
    publicInvoiceUrl,
    '',
    'Thank you.'
  ].join('\n');

  const html = `
  <p>Hi ${escapeHtml(clientName || 'there')},</p>
  <p>You have a new invoice <strong>${escapeHtml(invoiceNumber)}</strong> for <strong>${escapeHtml(formatInr(total))}</strong>.</p>
  <p><a href="${escapeAttr(paymentUrl)}">Pay now</a> — payment is processed by Razorpay to ${escapeHtml(businessName || 'the business')}.</p>
  <p><a href="${escapeAttr(publicInvoiceUrl)}">View invoice online</a></p>
  <p>Thank you.</p>
  `;

  try {
    await t.sendMail({ from, to, subject, text, html });
    return { sent: true };
  } catch (err) {
    console.error('[email] sendMail failed:', err.message || err);
    return { sent: false, skipped: false, error: err.message || 'SMTP send failed' };
  }
};

export const sendOverdueReminderEmail = async ({
  to,
  clientName,
  invoiceNumber,
  total,
  paymentUrl,
  publicInvoiceUrl,
  businessName
}) => {
  const t = getTransporter();
  if (!t) {
    console.warn('[email] SMTP not configured — overdue reminder not emailed.');
    return { sent: false, skipped: true };
  }

  const from = process.env.EMAIL_FROM;
  const subject = `Reminder: ${invoiceNumber} is overdue — ${businessName || 'Invoice'}`;
  const text = [
    `Hi ${clientName || 'there'},`,
    '',
    `This is a reminder that invoice ${invoiceNumber} (${formatInr(total)}) is overdue.`,
    '',
    `Pay here:`,
    paymentUrl,
    '',
    `Details:`,
    publicInvoiceUrl,
    ''
  ].join('\n');

  const html = `
  <p>Hi ${escapeHtml(clientName || 'there')},</p>
  <p>Invoice <strong>${escapeHtml(invoiceNumber)}</strong> (${escapeHtml(formatInr(total))}) is <strong>overdue</strong>.</p>
  <p><a href="${escapeAttr(paymentUrl)}">Pay now</a></p>
  <p><a href="${escapeAttr(publicInvoiceUrl)}">View invoice</a></p>
  `;

  try {
    await t.sendMail({ from, to, subject, text, html });
    return { sent: true };
  } catch (err) {
    console.error('[email] reminder sendMail failed:', err.message || err);
    return { sent: false, skipped: false, error: err.message || 'SMTP send failed' };
  }
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

export { isEmailConfigured };
