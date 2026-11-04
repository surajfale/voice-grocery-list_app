import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import './utils/dnsFix.js';
import { resolveTrustProxy } from './utils/trustProxy.js';

import authRoutes from './routes/auth.js';
import groceryListRoutes from './routes/groceryLists.js';
import receiptRoutes from './routes/receipts.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Refusing to start without a session signing secret.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// "trust proxy" decides how req.ip is derived from X-Forwarded-For, and every
// rate limiter keys on req.ip. It must be a hop count (or explicit proxy
// addresses), never `true`: with `true` Express uses the left-most XFF entry,
// which the client controls, so each request could claim a fresh IP and
// bypass the login, sign-up and password-reset limits.
const trustProxyValue = resolveTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV);
app.set('trust proxy', trustProxyValue);
console.log(`🔐 Express trust proxy set to: ${JSON.stringify(trustProxyValue)}`);

// Security middleware
app.use(helmet());

// Rate limiting - more lenient for development. Keyed on req.ip (the
// express-rate-limit default); never on a raw client-supplied header.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
  message: 'Too many requests from this client, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  throw error;
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/grocery-lists', groceryListRoutes);
app.use('/api/receipts', receiptRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((error, req, res, _next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});