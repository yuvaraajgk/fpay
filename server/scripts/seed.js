/**
 * Seed script - adds test clients and invoices for testing FreelancePay
 * Run: node scripts/seed.js (from server directory)
 * Or: npm run seed
 *
 * Uses the first user in the database. Make sure you have registered first!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import User from '../models/User.js';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';

const TEST_CLIENTS = [
  {
    name: 'Acme Corp',
    email: 'billing@acmecorp.example.com',
    phone: '+91 98765 43210',
    company: 'Acme Corporation',
    address: '123 Business Park, Mumbai, India'
  },
  {
    name: 'TechStart Solutions',
    email: 'accounts@techstart.example.com',
    phone: '+91 91234 56789',
    company: 'TechStart Solutions Pvt Ltd',
    address: '456 Startup Hub, Bangalore'
  },
  {
    name: 'Design Studio Co',
    email: 'hello@designstudio.example.com',
    phone: '+91 99887 76655',
    company: 'Design Studio Co',
    address: '789 Creative Block, Chennai'
  },
  {
    name: 'Cloud Nine Inc',
    email: 'finance@cloudnine.example.com',
    phone: '+91 88765 43210',
    company: 'Cloud Nine Inc',
    address: '321 Tech Valley, Hyderabad'
  }
];

const INVOICE_LINE_ITEMS = [
  [
    { description: 'Web Development - Landing Page', quantity: 1, unitPrice: 15000 },
    { description: 'UI/UX Design', quantity: 1, unitPrice: 8000 }
  ],
  [
    { description: 'Monthly Retainer - Consulting', quantity: 1, unitPrice: 25000 },
    { description: 'Hourly Support (5 hrs)', quantity: 5, unitPrice: 1500 }
  ],
  [
    { description: 'Logo Design Package', quantity: 1, unitPrice: 12000 },
    { description: 'Brand Guidelines Document', quantity: 1, unitPrice: 5000 }
  ],
  [
    { description: 'API Integration Service', quantity: 1, unitPrice: 18000 },
    { description: 'Testing & QA', quantity: 1, unitPrice: 6000 }
  ]
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const user = await User.findOne();
    if (!user) {
      console.error('\n❌ No user found! Please register first at http://localhost:3000/register\n');
      process.exit(1);
    }

    console.log(`\nSeeding data for user: ${user.name} (${user.email})\n`);

    // Create clients
    const clients = [];
    for (const clientData of TEST_CLIENTS) {
      const existing = await Client.findOne({
        freelancerId: user._id,
        email: clientData.email
      });
      if (existing) {
        clients.push(existing);
        console.log(`  Client already exists: ${clientData.name}`);
      } else {
        const client = await Client.create({
          freelancerId: user._id,
          ...clientData
        });
        clients.push(client);
        console.log(`  ✓ Created client: ${clientData.name}`);
      }
    }

    // Create invoices in different statuses
    const now = new Date();
    const pastDue = new Date(now);
    pastDue.setDate(pastDue.getDate() - 10);
    const futureDue = new Date(now);
    futureDue.setDate(futureDue.getDate() + 14);

    const invoiceConfigs = [
      { clientIndex: 0, status: 'draft', dueDate: futureDue, lineItems: INVOICE_LINE_ITEMS[0], tax: 18, discount: 0 },
      { clientIndex: 1, status: 'sent', dueDate: futureDue, lineItems: INVOICE_LINE_ITEMS[1], tax: 18, discount: 5 },
      { clientIndex: 2, status: 'paid', dueDate: pastDue, lineItems: INVOICE_LINE_ITEMS[2], tax: 18, discount: 10 },
      { clientIndex: 3, status: 'overdue', dueDate: pastDue, lineItems: INVOICE_LINE_ITEMS[3], tax: 18, discount: 0 }
    ];

    // Get next invoice number for this freelancer
    const lastInvoice = await Invoice.findOne({ freelancerId: user._id })
      .sort({ invoiceNumber: -1 })
      .select('invoiceNumber');
    let nextNum = 1;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const formatInvNum = (n) => `INV-${n.toString().padStart(4, '0')}`;

    for (const config of invoiceConfigs) {
      const client = clients[config.clientIndex];
      const subtotal = config.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const total = Math.round(subtotal * (1 + config.tax / 100) * (1 - config.discount / 100) * 100) / 100;

      const existingInvoice = await Invoice.findOne({
        freelancerId: user._id,
        clientId: client._id,
        status: config.status
      });

      if (existingInvoice) {
        console.log(`  Invoice already exists: ${config.status} for ${client.name}`);
      } else {
        const invoiceNumber = formatInvNum(nextNum++);
        await Invoice.create({
          freelancerId: user._id,
          clientId: client._id,
          invoiceNumber,
          lineItems: config.lineItems,
          subtotal,
          tax: config.tax,
          discount: config.discount,
          total,
          dueDate: config.dueDate,
          status: config.status,
          // No fake payment URL — real link is created when you Send from the app (Razorpay API)
          stripePaymentLink: ''
        });
        console.log(`  ✓ Created ${config.status} invoice for ${client.name} (₹${total})`);
      }
    }

    console.log('\n✅ Seed complete!\n');
    console.log('Summary:');
    console.log('  - 4 clients');
    console.log('  - 1 draft invoice (edit & send to test full flow)');
    console.log('  - 1 sent invoice (use Send to create a real Razorpay link)');
    console.log('  - 1 paid invoice (for dashboard stats)');
    console.log('  - 1 overdue invoice (test reminder action)\n');
    console.log('See TEST_DATA_GUIDE.md for how to test each feature.\n');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
    process.exit(0);
  }
}

seed();
