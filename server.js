require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { pool } = require('./config/database');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const customerRoutes = require('./routes/customers');
const vendorRoutes = require('./routes/vendors');
const inventoryRoutes = require('./routes/inventory');
const receivingRoutes = require('./routes/receiving');
const reportsRoutes = require('./routes/reports');
const expenseRoutes = require('./routes/expenses');
const auditLogRoutes = require('./routes/auditLogs');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', authMiddleware, employeeRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/sales', authMiddleware, salesRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/vendors', authMiddleware, vendorRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/receiving', authMiddleware, receivingRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/audit-logs', authMiddleware, auditLogRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ POS System running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
