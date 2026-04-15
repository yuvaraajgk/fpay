import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import invoiceRoutes from './routes/invoices.js';
import webhookRoutes from './routes/webhooks.js';
import publicRoutes from './routes/public.js';
import dashboardRoutes from './routes/dashboard.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// IMPORTANT: Webhook route must use raw body parser BEFORE express.json()
// Razorpay webhooks require raw body for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// JSON body parser (after webhook route)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route for health check
app.get('/', (req, res) => {
  res.json({ message: 'FreelancePay API is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server only after MongoDB is connected (avoids Mongoose buffering timeouts)
const PORT = process.env.PORT || 5001;
const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};
start();
