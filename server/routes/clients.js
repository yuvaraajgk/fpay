import express from 'express';
import { 
  createClient, 
  getClients, 
  getClient, 
  updateClient, 
  deleteClient 
} from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules for creating/updating clients
const clientValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
];

// Routes
// POST /api/clients - Create a new client
router.post('/', clientValidation, handleValidationErrors, createClient);

// GET /api/clients - Get all clients for logged-in freelancer
router.get('/', getClients);

// GET /api/clients/:id - Get a single client by ID
router.get('/:id', getClient);

// PUT /api/clients/:id - Update a client
router.put('/:id', clientValidation, handleValidationErrors, updateClient);

// DELETE /api/clients/:id - Delete a client
router.delete('/:id', deleteClient);

export default router;
