/**
 * Razorpay Webhook Test Script
 *
 * Tests all webhook event handlers against a real local server + MongoDB.
 * Requires the server to be running: npm start (or npm run dev)
 *
 * Usage:
 *   node scripts/testWebhooks.js
 *   node scripts/testWebhooks.js --event payment_link.paid
 */

import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Client from '../models/Client.js';

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:5001';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const WEBHOOK_URL = `${SERVER_URL}/api/webhooks/razorpay`;

const eventFlagIdx = process.argv.indexOf('--event');
const ONLY_EVENT =
  process.argv.find((a) => a.startsWith('--event='))?.split('=')[1] ||
  (eventFlagIdx !== -1 ? process.argv[eventFlagIdx + 1] : null);

// ─── Helpers ────────────────────────────────────────────────────────────────

const sign = (payload) =>
  crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');

const sendWebhook = async (event, payloadObj) => {
  const body = JSON.stringify(payloadObj);
  const signature = sign(body);
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature
    },
    body
  });
  return { status: res.status, data: await res.json() };
};

const getInvoice = (id) => Invoice.findById(id);

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);

const check = (label, actual, expected) => {
  if (actual === expected) {
    pass(`${label}: "${actual}"`);
    return true;
  } else {
    fail(`${label}: expected "${expected}", got "${actual}"`);
    return false;
  }
};

// ─── Test data setup ─────────────────────────────────────────────────────────

let testUser, testClient, testInvoiceBase;

const setup = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  testUser = await User.findOne({});
  if (!testUser) throw new Error('No user found in DB — register one first via the app');

  testClient = await Client.findOne({ freelancerId: testUser._id });
  if (!testClient) throw new Error('No client found — create one first via the app');

  testInvoiceBase = {
    freelancerId: testUser._id,
    clientId: testClient._id,
    lineItems: [{ description: 'Test service', quantity: 1, unitPrice: 1000 }],
    subtotal: 1000,
    tax: 0,
    discount: 0,
    total: 1000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'sent'
  };
};

const createInvoice = async (overrides = {}) => {
  return Invoice.create({ ...testInvoiceBase, ...overrides });
};

const cleanup = async (ids) => {
  await Invoice.deleteMany({ _id: { $in: ids } });
};

// ─── Individual event tests ──────────────────────────────────────────────────

const tests = {
  async 'payment_link.paid'() {
    const invoice = await createInvoice({ razorpayPaymentLinkId: 'plink_test_001' });
    const plinkEntity = {
      id: 'plink_test_001',
      reference_id: invoice._id.toString(),
      payment_id: 'pay_test_001',
      paid_at: Math.floor(Date.now() / 1000),
      status: 'paid'
    };

    const { status } = await sendWebhook('payment_link.paid', {
      event: 'payment_link.paid',
      payload: { payment_link: { entity: plinkEntity } }
    });

    const updated = await getInvoice(invoice._id);
    check('HTTP status', status, 200);
    check('invoice.status', updated.status, 'paid');
    check('invoice.razorpayPaymentId', updated.razorpayPaymentId, 'pay_test_001');
    const hasPaidAt = updated.paidAt instanceof Date;
    hasPaidAt ? pass('invoice.paidAt set') : fail('invoice.paidAt missing');

    await cleanup([invoice._id]);
  },

  async 'payment_link.cancelled'() {
    const invoice = await createInvoice({ razorpayPaymentLinkId: 'plink_test_002' });
    const { status } = await sendWebhook('payment_link.cancelled', {
      event: 'payment_link.cancelled',
      payload: { payment_link: { entity: { id: 'plink_test_002', reference_id: invoice._id.toString() } } }
    });

    const updated = await getInvoice(invoice._id);
    check('HTTP status', status, 200);
    check('invoice.status', updated.status, 'cancelled');

    await cleanup([invoice._id]);
  },

  async 'payment_link.expired'() {
    const invoice = await createInvoice({ razorpayPaymentLinkId: 'plink_test_003' });
    const { status } = await sendWebhook('payment_link.expired', {
      event: 'payment_link.expired',
      payload: { payment_link: { entity: { id: 'plink_test_003', reference_id: invoice._id.toString() } } }
    });

    const updated = await getInvoice(invoice._id);
    check('HTTP status', status, 200);
    check('invoice.status', updated.status, 'expired');

    await cleanup([invoice._id]);
  },

  async 'payment.captured.order'() {
    const invoice = await createInvoice({ razorpayOrderId: 'order_test_001' });
    const paymentEntity = {
      id: 'pay_test_002',
      order_id: 'order_test_001',
      status: 'captured',
      amount: 100000,
      captured_at: Math.floor(Date.now() / 1000),
      notes: {}
    };

    const { status } = await sendWebhook('payment.captured', {
      event: 'payment.captured',
      payload: { payment: { entity: paymentEntity } }
    });

    const updated = await getInvoice(invoice._id);
    check('HTTP status', status, 200);
    check('invoice.status', updated.status, 'paid');
    check('invoice.razorpayPaymentId', updated.razorpayPaymentId, 'pay_test_002');

    await cleanup([invoice._id]);
  },

  async 'payment.captured.plink'() {
    const invoice = await createInvoice({ razorpayPaymentLinkId: 'plink_test_004' });
    const paymentEntity = {
      id: 'pay_test_003',
      payment_link_id: 'plink_test_004',
      status: 'captured',
      amount: 100000,
      captured_at: Math.floor(Date.now() / 1000),
      notes: {}
    };

    const { status } = await sendWebhook('payment.captured', {
      event: 'payment.captured',
      payload: { payment: { entity: paymentEntity } }
    });

    const updated = await getInvoice(invoice._id);
    check('HTTP status', status, 200);
    check('invoice.status', updated.status, 'paid');

    await cleanup([invoice._id]);
  },

  async 'payment.failed'() {
    const invoice = await createInvoice({ razorpayOrderId: 'order_test_002' });
    const paymentEntity = {
      id: 'pay_test_004',
      order_id: 'order_test_002',
      status: 'failed',
      notes: {}
    };

    const { status } = await sendWebhook('payment.failed', {
      event: 'payment.failed',
      payload: { payment: { entity: paymentEntity } }
    });

    const updated = await getInvoice(invoice._id);
    check('HTTP status', status, 200);
    check('invoice.status', updated.status, 'declined');

    await cleanup([invoice._id]);
  },

  async 'invalid.signature'() {
    const body = JSON.stringify({ event: 'payment_link.paid', payload: {} });
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'bad_signature'
      },
      body
    });
    check('HTTP status (should reject)', res.status, 400);
  },

  async 'missing.signature'() {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'payment_link.paid', payload: {} })
    });
    check('HTTP status (should reject)', res.status, 400);
  }
};

// ─── Runner ──────────────────────────────────────────────────────────────────

const run = async () => {
  if (!WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET not set in .env');
    process.exit(1);
  }

  try {
    await setup();
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  }

  const toRun = ONLY_EVENT
    ? Object.entries(tests).filter(([name]) => name === ONLY_EVENT)
    : Object.entries(tests);

  if (ONLY_EVENT && toRun.length === 0) {
    console.error(`Unknown event: "${ONLY_EVENT}". Available: ${Object.keys(tests).join(', ')}`);
    process.exit(1);
  }

  let passed = 0, failed = 0;

  for (const [name, fn] of toRun) {
    console.log(`\n▶ ${name}`);
    try {
      await fn();
      passed++;
    } catch (err) {
      fail(`Threw: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

run();
