import mongoose from 'mongoose';

// Line item schema (embedded subdocument)
const lineItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Line item description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  }
}, { _id: false }); // No separate _id for line items

const invoiceSchema = new mongoose.Schema({
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Freelancer ID is required'],
    index: true // Index for faster queries when filtering by freelancer
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required'],
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  lineItems: {
    type: [lineItemSchema],
    required: [true, 'At least one line item is required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Invoice must have at least one line item'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'declined', 'expired'],
    default: 'draft',
    index: true // Index for filtering by status
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  pdfUrl: {
    type: String,
    default: ''
  },
  /** S3 key e.g. invoices/invoice-INV-0001.pdf — used to mint new pre-signed URLs after pdfUrl expires */
  pdfS3Key: {
    type: String,
    default: ''
  },
  stripePaymentLink: {
    type: String,
    default: ''
  },
  /** Razorpay Payment Link id (plink_...) for webhook matching */
  razorpayPaymentLinkId: {
    type: String,
    default: ''
  },
  /** Razorpay Order id (order_...) when total ≥ PAYMENT_LINK_MAX_INR — higher limits than Payment Links */
  razorpayOrderId: {
    type: String,
    default: '',
    index: true
  },
  /** Razorpay payment id (pay_...) when status is paid — for reference */
  razorpayPaymentId: {
    type: String,
    default: ''
  },
  /** When Razorpay recorded the successful payment */
  paidAt: {
    type: Date
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Invoice numbers are unique per freelancer (not globally — each business has its own INV-0001)
invoiceSchema.index({ freelancerId: 1, invoiceNumber: 1 }, { unique: true });

// Compound index: freelancerId + status for faster filtered queries
invoiceSchema.index({ freelancerId: 1, status: 1 });

// Compound index: freelancerId + createdAt for sorting recent invoices
invoiceSchema.index({ freelancerId: 1, createdAt: -1 });

// Compound index: freelancerId + dueDate for overdue queries
invoiceSchema.index({ freelancerId: 1, dueDate: 1 });

// Pre-validate: must run before Mongoose required checks (validation runs before pre('save'))
invoiceSchema.pre('validate', async function () {
  if (this.isNew && !this.invoiceNumber) {
    this.invoiceNumber = await generateInvoiceNumber(this.freelancerId);
  }
});

// Function to generate invoice number per freelancer
async function generateInvoiceNumber(freelancerId) {
  try {
    // Find the highest invoice number for this freelancer
    const lastInvoice = await mongoose.model('Invoice')
      .findOne({ freelancerId })
      .sort({ invoiceNumber: -1 })
      .select('invoiceNumber');

    let nextNumber = 1;

    if (lastInvoice && lastInvoice.invoiceNumber) {
      // Extract number from format "INV-0001"
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format as INV-0001, INV-0002, etc. (4 digits minimum)
    const formattedNumber = `INV-${nextNumber.toString().padStart(4, '0')}`;
    
    return formattedNumber;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    // Fallback: use timestamp-based number
    return `INV-${Date.now().toString().slice(-6)}`;
  }
}

export default mongoose.model('Invoice', invoiceSchema);


//Boss, the lineItem schema and invoice schema work together to represent a complete invoice with multiple services/products. Think of it like a bill where each service is listed separately and the invoice contains all of them.
//lineItemSchema defines the structure of each service/product in an invoice. invoiceSchema represents the full invoice and contains multiple line items along with totals, client info, and status.