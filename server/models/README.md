# Database Models Documentation

## Overview
This document explains the database schemas and their relationships in the FreelancePay application.

## Models

### 1. User Model (`User.js`)
Represents a freelancer/user account.

**Fields:**
- `name` (String, required) - User's full name
- `email` (String, required, unique) - User's email address
- `password` (String, required) - Hashed password (min 6 characters)
- `businessName` (String, optional) - Business name
- `logoUrl` (String, optional) - URL to business logo
**Relationships:**
- One-to-Many with `Client` (via `freelancerId`)
- One-to-Many with `Invoice` (via `freelancerId`)

**Indexes:**
- `email` - Unique index for fast lookups

---

### 2. Client Model (`Client.js`)
Represents a client that belongs to a freelancer.

**Fields:**
- `freelancerId` (ObjectId, required, ref: 'User') - Reference to the freelancer who owns this client
- `name` (String, required) - Client's name
- `email` (String, required) - Client's email
- `phone` (String, optional) - Client's phone number
- `company` (String, optional) - Client's company name
- `address` (String, optional) - Client's address

**Relationships:**
- Many-to-One with `User` (belongs to a freelancer)
- One-to-Many with `Invoice` (can have multiple invoices)

**Indexes:**
- `freelancerId` - Single field index for filtering clients by freelancer
- `{ freelancerId: 1, email: 1 }` - Compound unique index ensures no duplicate emails per freelancer

**Usage Example:**
```javascript
// Find all clients for a freelancer
const clients = await Client.find({ freelancerId: userId });

// Create a new client
const client = await Client.create({
  freelancerId: userId,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '123-456-7890',
  company: 'Acme Corp',
  address: '123 Main St'
});
```

---

### 3. Invoice Model (`Invoice.js`)
Represents an invoice created by a freelancer for a client.

**Fields:**
- `freelancerId` (ObjectId, required, ref: 'User') - Reference to the freelancer
- `clientId` (ObjectId, required, ref: 'Client') - Reference to the client
- `invoiceNumber` (String, required, unique) - Auto-generated invoice number (format: INV-0001)
- `lineItems` (Array, required) - Array of line items:
  - `description` (String, required) - Item description
  - `quantity` (Number, required, min: 0) - Quantity
  - `unitPrice` (Number, required, min: 0) - Price per unit
- `subtotal` (Number, required, min: 0) - Sum of all line items
- `tax` (Number, default: 0, min: 0) - Tax percentage
- `discount` (Number, default: 0, min: 0) - Discount percentage
- `total` (Number, required, min: 0) - Final total amount
- `status` (String, enum, default: 'draft') - Invoice status:
  - `draft` - Invoice is being created
  - `sent` - Invoice has been sent to client
  - `paid` - Invoice has been paid
  - `overdue` - Invoice is past due date
- `dueDate` (Date, required) - Payment due date
- `pdfUrl` (String, optional) - URL to generated PDF (stored in S3)
- `stripePaymentLink` (String, optional) - Stripe Payment Link URL

**Relationships:**
- Many-to-One with `User` (belongs to a freelancer)
- Many-to-One with `Client` (belongs to a client)

**Indexes:**
- `freelancerId` - Single field index
- `clientId` - Single field index
- `invoiceNumber` - Unique index for fast lookups
- `status` - Single field index for filtering by status
- `{ freelancerId: 1, status: 1 }` - Compound index for filtering invoices by freelancer and status
- `{ freelancerId: 1, createdAt: -1 }` - Compound index for sorting recent invoices
**Invoice Number Generation:**
- Auto-generated per freelancer using a pre-save hook
- Format: `INV-0001`, `INV-0002`, etc. (4-digit padding)
- Finds the highest invoice number for the freelancer and increments
- Each freelancer starts at `INV-0001`
- Fallback to timestamp-based number if generation fails

**Usage Example:**
```javascript
// Create a new invoice (invoiceNumber will be auto-generated)
const invoice = await Invoice.create({
  freelancerId: userId,
  clientId: clientId,
  lineItems: [
    { description: 'Web Development', quantity: 10, unitPrice: 100 },
    { description: 'Design', quantity: 5, unitPrice: 50 }
  ],
  subtotal: 1250,
  tax: 10,
  discount: 5,
  total: 1306.25,
  status: 'draft',
  dueDate: new Date('2024-12-31')
});

// Find all invoices for a freelancer with status 'sent'
const sentInvoices = await Invoice.find({ 
  freelancerId: userId, 
  status: 'sent' 
});

// Find invoices with populated client data
const invoices = await Invoice.find({ freelancerId: userId })
  .populate('clientId', 'name email company')
  .sort({ createdAt: -1 });
```

---

## Database Relationships Diagram

```
User (Freelancer)
  ├── has many ──> Client
  │                 └── has many ──> Invoice
  │
  └── has many ──> Invoice
```

## Index Strategy

**Why these indexes?**
1. **Single field indexes** (`freelancerId`, `clientId`, `status`) - Fast filtering on common queries
2. **Compound indexes** - Optimize queries that filter by multiple fields:
   - `{ freelancerId, email }` - Prevents duplicate clients per freelancer
   - `{ freelancerId, status }` - Fast filtering of invoices by status for a freelancer
   - `{ freelancerId, createdAt }` - Fast sorting of recent invoices
   - `{ freelancerId, dueDate }` - Fast queries for overdue invoices

**Query Performance:**
- Finding all clients for a freelancer: Uses `freelancerId` index
- Finding invoices by status: Uses compound `{ freelancerId, status }` index
- Checking for duplicate client emails: Uses compound unique index
- Sorting recent invoices: Uses compound `{ freelancerId, createdAt }` index
