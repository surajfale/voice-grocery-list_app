import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import groceryListRoutes from './routes/groceryLists.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Express "trust proxy" to allow correct IP extraction behind proxies/load-balancers
// Set via env: TRUST_PROXY. Accepts values: 'true', 'false', '1', 'loopback', '127.0.0.1' etc.
// Defaults: production -> true (assume running behind proxy), development -> false
const defaultTrust = process.env.NODE_ENV === 'production' ? 'true' : 'false';
const trustProxyEnv = typeof process.env.TRUST_PROXY !== 'undefined' ? process.env.TRUST_PROXY : defaultTrust;
// Express accepts boolean true/false or numeric/strings like 'loopback'/'127.0.0.1'
const trustProxyValue = (trustProxyEnv === 'true' || trustProxyEnv === '1') ? true : (trustProxyEnv === 'false' ? false : trustProxyEnv);
app.set('trust proxy', trustProxyValue);
console.log(`🔐 Express trust proxy set to: ${JSON.stringify(trustProxyValue)}`);

// Security middleware
app.use(helmet());

// Rate limiting - more lenient for development
// Allow configurable key source so we can choose how to identify clients when behind proxies.
// RATE_LIMIT_KEY_SOURCE can be:
//  - 'ip'           -> use req.ip
//  - 'x-real-ip'    -> use req.headers['x-real-ip'] || req.ip
//  - 'header:My-Header-Name' -> use a specific header (case-insensitive) falling back to req.ip
//  - 'auto' (default) -> uses req.ip if trust proxy is enabled, otherwise prefers x-real-ip header
const rateLimitKeySource = process.env.RATE_LIMIT_KEY_SOURCE || 'auto';

let keyGenerator;
if (rateLimitKeySource && rateLimitKeySource.toLowerCase().startsWith('header:')) {
  const headerName = rateLimitKeySource.slice('header:'.length).trim().toLowerCase();
  keyGenerator = (req) => (req.headers && (req.headers[headerName] || req.headers[headerName.toLowerCase()])) || req.ip;
} else if (rateLimitKeySource === 'ip') {
  keyGenerator = (req) => req.ip;
} else if (rateLimitKeySource === 'x-real-ip') {
  keyGenerator = (req) => req.headers && (req.headers['x-real-ip'] || req.headers['x-real-ip'.toLowerCase()]) || req.ip;
} else {
  // auto
  const trustProxy = app.get('trust proxy');
  if (trustProxy) {
    keyGenerator = (req) => req.ip;
  } else {
    keyGenerator = (req) => (req.headers && (req.headers['x-real-ip'] || req.headers['x-real-ip'.toLowerCase()])) || req.ip;
  }
}

console.log(`🔁 Rate limiter key source: ${rateLimitKeySource}`);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
  message: 'Too many requests from this client, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator,
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