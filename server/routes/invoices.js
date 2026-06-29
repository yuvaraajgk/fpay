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

router.use(authenticate);

const lineItemValidation = [
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').trim().notEmpty().withMessage('Line item description is required'),
  body('lineItems.*.quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number')
];

// clientId required on create, optional on update
const createInvoiceValidation = [
  body('clientId').notEmpty().withMessage('Client ID is required').isMongoId().withMessage('Invalid client ID format'),
  body('dueDate').notEmpty().withMessage('Due date is required').isISO8601().withMessage('Due date must be a valid date'),
  body('tax').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax must be between 0 and 100'),
  body('discount').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'declined', 'expired'])
    .withMessage('Status must be one of: draft, sent, paid, overdue, cancelled, declined, expired')
];

const updateInvoiceValidation = [
  body('clientId').optional().isMongoId().withMessage('Invalid client ID format'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date'),
  body('tax').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax must be between 0 and 100'),
  body('discount').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'declined', 'expired'])
    .withMessage('Status must be one of: draft, sent, paid, overdue, cancelled, declined, expired')
];

const updateLineItemValidation = [
  body('lineItems').optional().isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').optional().trim().notEmpty().withMessage('Line item description is required'),
  body('lineItems.*.quantity').optional().isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('lineItems.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be a positive number')
];

router.post('/', [...createInvoiceValidation, ...lineItemValidation], handleValidationErrors, createInvoice);
router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.put('/:id', [...updateInvoiceValidation, ...updateLineItemValidation], handleValidationErrors, updateInvoice);
router.post('/:id/send', sendInvoice);
router.post('/:id/mark-overdue', markOverdue);
router.post('/:id/send-reminder', sendOverdueReminder);

export default router;
