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

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

const emailWrapper = (bodyHtml) => `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
    ${bodyHtml}
    <p style="font-size: 12px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      This is an automated invoice notification. Please do not reply directly to this email.
    </p>
  </div>
`;

export const sendInvoiceEmail = async ({
  to,
  clientName,
  invoiceNumber,
  total,
  dueDate,
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
  const sender = businessName || 'your vendor';
  const subject = `Invoice ${invoiceNumber} from ${sender}`;

  const text = [
    `Hi ${clientName || 'there'},`,
    '',
    `${sender} has sent you a new invoice.`,
    '',
    `Invoice Number: ${invoiceNumber}`,
    dueDate ? `Due Date: ${formatDate(dueDate)}` : '',
    `Amount Due: ${formatInr(total)}`,
    '',
    `View and pay this invoice securely online:`,
    publicInvoiceUrl,
    '',
    'Thank you for your business.'
  ]
    .filter(Boolean)
    .join('\n');

  const html = emailWrapper(`
    <p style="font-size: 16px;">Hi ${escapeHtml(clientName || 'there')},</p>
    <p style="font-size: 15px; line-height: 1.6;">
      ${escapeHtml(sender)} has sent you a new invoice. Details are below.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Invoice Number</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(invoiceNumber)}</td>
      </tr>
      ${
        dueDate
          ? `<tr>
        <td style="padding: 8px 0; color: #6b7280;">Due Date</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(formatDate(dueDate))}</td>
      </tr>`
          : ''
      }
      <tr>
        <td style="padding: 12px 0 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Amount Due</td>
        <td style="padding: 12px 0 0; text-align: right; font-weight: 700; font-size: 18px; color: #2563eb; border-top: 1px solid #e5e7eb;">${escapeHtml(formatInr(total))}</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeAttr(publicInvoiceUrl)}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">View &amp; Pay Invoice</a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Payments are processed securely by Razorpay directly to ${escapeHtml(sender)}.</p>
    <p style="font-size: 14px; margin-top: 32px;">Thank you for your business.<br/>${escapeHtml(sender)}</p>
  `);

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
  dueDate,
  publicInvoiceUrl,
  businessName
}) => {
  const t = getTransporter();
  if (!t) {
    console.warn('[email] SMTP not configured — overdue reminder not emailed.');
    return { sent: false, skipped: true };
  }

  const from = process.env.EMAIL_FROM;
  const sender = businessName || 'Invoice';
  const subject = `Reminder: Invoice ${invoiceNumber} is overdue — ${sender}`;

  const text = [
    `Hi ${clientName || 'there'},`,
    '',
    `This is a friendly reminder that invoice ${invoiceNumber} (${formatInr(total)}) from ${sender} is now overdue.`,
    dueDate ? `Original due date: ${formatDate(dueDate)}` : '',
    '',
    `View and pay this invoice securely online:`,
    publicInvoiceUrl,
    '',
    'Thank you for taking care of this promptly.'
  ]
    .filter(Boolean)
    .join('\n');

  const html = emailWrapper(`
    <p style="font-size: 16px;">Hi ${escapeHtml(clientName || 'there')},</p>
    <p style="font-size: 15px; line-height: 1.6;">
      This is a friendly reminder that invoice <strong>${escapeHtml(invoiceNumber)}</strong> from ${escapeHtml(sender)} is now
      <strong style="color: #b91c1c;">overdue</strong>.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
      ${
        dueDate
          ? `<tr>
        <td style="padding: 8px 0; color: #6b7280;">Original Due Date</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(formatDate(dueDate))}</td>
      </tr>`
          : ''
      }
      <tr>
        <td style="padding: 12px 0 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Amount Due</td>
        <td style="padding: 12px 0 0; text-align: right; font-weight: 700; font-size: 18px; color: #b91c1c; border-top: 1px solid #e5e7eb;">${escapeHtml(formatInr(total))}</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeAttr(publicInvoiceUrl)}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">View &amp; Pay Invoice</a>
    </div>
    <p style="font-size: 14px; margin-top: 32px;">Thank you for taking care of this promptly.<br/>${escapeHtml(sender)}</p>
  `);

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
