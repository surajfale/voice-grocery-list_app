import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for password reset requests
 * Prevents brute force attacks and abuse
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 requests per window per IP
  message: {
    success: false,
    error: 'Too many password reset requests. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + email combination for more precise limiting
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.email || 'unknown'}`;
  },
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for password reset: IP=${req.ip}, Email=${req.body.email}`);
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests. Please try again in 15 minutes.'
    });
  }
});

/**
 * Rate limiter for token validation attempts
 * Prevents token enumeration attacks
 */
export const tokenValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 validation attempts per window
  message: {
    success: false,
    error: 'Too many validation attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful validations
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for token validation: IP=${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many validation attempts. Please try again later.'
    });
  }
});

/**
 * Rate limiter for password reset completion
 * Prevents brute force password reset attempts
 */
export const passwordResetCompletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 reset completions per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for password reset completion: IP=${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts. Please try again later.'
    });
  }
});

/**
 * Rate limiter for login attempts
 * Prevents brute force login attacks
 */
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced for development)
  max: 10, // Max 10 failed login attempts (increased for development)
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 5 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for login: IP=${req.ip}, Email=${req.body.email}`);
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again in 5 minutes.'
    });
  }
});

/**
 * Rate limiter for registration
 * Prevents spam account creation
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 registrations per hour per IP
  message: {
    success: false,
    error: 'Too many accounts created. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for registration: IP=${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many accounts created. Please try again later.'
    });
  }
});

/**
 * Rate limiter for account deletion
 * Prevents abuse of account deletion endpoint
 */
export const accountDeletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2, // Max 2 deletion attempts per hour per IP
  message: {
    success: false,
    error: 'Too many account deletion attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for account deletion: IP=${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many account deletion attempts. Please try again later.'
    });
  }
});

/**
 * Rate limiter for receipt chat requests (per user)
 */
export const receiptChatUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.body?.userId || 'anonymous';
    return `${userId}-${req.ip}`;
  },
  handler: (req, res) => {
    console.warn(`⚠️ Chat rate limit exceeded for user=${req.body?.userId} ip=${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'You have reached the chat rate limit. Please wait a few minutes before trying again.'
    });
  }
});

/**
 * Rate limiter for receipt chat requests (per IP)
 */
export const receiptChatIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Chat IP rate limit exceeded for ip=${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many chat requests from this IP. Please slow down.'
    });
  }
});