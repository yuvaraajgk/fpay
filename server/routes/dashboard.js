import express from 'express';
import {
  getDashboardStats,
  getMonthlyRevenue,
  getYearlyRevenue,
  getRecentInvoices
} from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', getDashboardStats);

// GET /api/dashboard/revenue - Get monthly revenue data
router.get('/revenue', getMonthlyRevenue);

// GET /api/dashboard/yearly-revenue - Get yearly revenue data
router.get('/yearly-revenue', getYearlyRevenue);

// GET /api/dashboard/recent-invoices - Get recent invoices
router.get('/recent-invoices', getRecentInvoices);

export default router;
