import express from 'express';
import { register, login } from '../controllers/authController.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('businessName').optional().trim(),
  body('logoUrl').optional().isURL().withMessage('Logo URL must be a valid URL')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register route: POST /api/auth/register
router.post('/register', registerValidation, handleValidationErrors, register);

// Login route: POST /api/auth/login
router.post('/login', loginValidation, handleValidationErrors, login);

export default router;
