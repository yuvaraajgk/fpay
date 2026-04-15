# Services Documentation

This directory contains service modules for external integrations and utilities.

## PDF Service (`pdf.js`)

### `generateInvoicePDF(invoice, client, freelancer)`

Generates a professional invoice PDF using `pdf-lib`.

**Parameters:**
- `invoice` - Invoice document from MongoDB
- `client` - Client document from MongoDB
- `freelancer` - User document (freelancer) from MongoDB

**Returns:** `Promise<Uint8Array>` - PDF buffer

**PDF Design:**
- Header with business name/logo and "INVOICE" title
- Invoice details: invoice number, date, due date, status
- Client information section ("Bill To")
- Line items table with description, quantity, unit price, and amount
- Totals section: subtotal, tax, discount, total
- Footer with thank you message

**Features:**
- Professional layout with proper spacing
- Color-coded status indicators
- Automatic page breaks for long invoices
- Responsive table layout

---

## S3 Service (`s3.js`)

### `uploadPDF(pdfBuffer, filename)`

Uploads a PDF buffer to AWS S3.

**Parameters:**
- `pdfBuffer` - PDF file buffer (Uint8Array or Buffer)
- `filename` - Filename for the PDF (e.g., 'invoice-123.pdf')

**Returns:** `Promise<string>` - S3 object key

**S3 Structure:**
- Files are stored in `invoices/` prefix
- Full key format: `invoices/invoice-{invoiceNumber}.pdf`

### `getSignedURL(key, expiresIn)`

Generates a pre-signed URL for accessing a PDF from S3.

**Parameters:**
- `key` - S3 object key
- `expiresIn` - URL expiration time in seconds (default: 7 days = 604800 seconds)

**Returns:** `Promise<string>` - Pre-signed URL

**Security:**
- URLs expire after 7 days by default
- Provides secure, time-limited access to PDFs
- No need to make S3 bucket public

### `uploadPDFAndGetURL(pdfBuffer, filename)`

Convenience function that uploads PDF and returns signed URL in one call.

**Returns:** `Promise<{key: string, signedUrl: string}>`

---

## Invoice PDF Service (`invoicePdfService.js`)

### `generateAndUploadInvoicePDF(invoice, client, freelancer)`

High-level function that combines PDF generation and S3 upload.

**Workflow:**
1. Generate PDF using invoice, client, and freelancer data
2. Upload PDF to S3
3. Generate pre-signed URL
4. Return both key and signed URL

**Returns:** `Promise<{key: string, signedUrl: string}>`

**Usage Example:**
```javascript
import { generateAndUploadInvoicePDF } from './services/invoicePdfService.js';

const { key, signedUrl } = await generateAndUploadInvoicePDF(
  invoice,
  client,
  freelancer
);

// Save signedUrl to invoice.pdfUrl in database
invoice.pdfUrl = signedUrl;
await invoice.save();
```

---

## Environment Variables Required

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=freelancepay-invoices
```

---

## AWS S3 Setup

1. **Create S3 Bucket:**
   - Go to AWS S3 Console
   - Create bucket with name matching `AWS_S3_BUCKET_NAME`
   - Choose region matching `AWS_REGION`
   - Keep bucket private (don't enable public access)

2. **IAM Permissions:**
   - Create IAM user with programmatic access
   - Attach policy with S3 permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "s3:PutObject",
             "s3:GetObject"
           ],
           "Resource": "arn:aws:s3:::your-bucket-name/*"
         }
       ]
     }
     ```
   - Save Access Key ID and Secret Access Key

3. **Add Credentials to .env:**
   - Copy `.env.example` to `.env`
   - Fill in AWS credentials

---

## Error Handling

All services throw errors that should be caught by the calling code:

```javascript
try {
  const pdfBuffer = await generateInvoicePDF(invoice, client, freelancer);
  const key = await uploadPDF(pdfBuffer, 'invoice.pdf');
  const signedUrl = await getSignedURL(key);
} catch (error) {
  console.error('PDF generation/upload failed:', error);
  // Handle error appropriately
}
```
