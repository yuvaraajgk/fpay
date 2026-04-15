import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  sendInvoice,
  markOverdue,
  sendOverdueReminder
} from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules for line items
const lineItemValidation = [
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description')
    .trim()
    .notEmpty()
    .withMessage('Line item description is required'),
  body('lineItems.*.quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('lineItems.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number')
];

// Validation rules for creating/updating invoices
const invoiceValidation = [
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .isMongoId()
    .withMessage('Invalid client ID format'),
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('tax')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax must be between 0 and 100'),
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'declined', 'expired'])
    .withMessage(
      'Status must be one of: draft, sent, paid, overdue, cancelled, declined, expired'
    )
];

// Routes
// POST /api/invoices - Create a new invoice
router.post('/', [...invoiceValidation, ...lineItemValidation], handleValidationErrors, createInvoice);

// GET /api/invoices - Get all invoices with optional filters (status, startDate, endDate)
router.get('/', getInvoices);

// GET /api/invoices/:id - Get a single invoice
router.get('/:id', getInvoice);

// PUT /api/invoices/:id - Update an invoice
router.put('/:id', [...invoiceValidation, ...lineItemValidation], handleValidationErrors, updateInvoice);

// POST /api/invoices/:id/send - Send invoice (mark as sent, create payment link, send email)
router.post('/:id/send', sendInvoice);

// POST /api/invoices/:id/mark-overdue - Manually mark invoice as overdue
router.post('/:id/mark-overdue', markOverdue);

// POST /api/invoices/:id/send-reminder - Send overdue reminder email
router.post('/:id/send-reminder', sendOverdueReminder);

export default router;
