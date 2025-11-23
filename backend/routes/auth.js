import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import GroceryList from '../models/GroceryList.js';
import emailService from '../services/emailService.js';
import { validatePassword } from '../utils/passwordValidator.js';
import {
  passwordResetLimiter,
  tokenValidationLimiter,
  passwordResetCompletionLimiter,
  loginLimiter,
  registrationLimiter,
  accountDeletionLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Helper function to get client IP address
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip ||
         'unknown';
};

// Register new user (with rate limiting)
router.post('/register', registrationLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password, email, firstName, lastName);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet security requirements',
        errors: passwordValidation.errors
      });
    }

    // Check total user count - limit to 10 accounts
    const userCount = await User.countDocuments();
    if (userCount >= 10) {
      console.warn(`⚠️ Registration attempt blocked: Maximum user limit (10) reached from IP: ${getClientIP(req)}`);
      return res.status(403).json({
        success: false,
        error: 'Registration is currently closed. Maximum number of accounts (10) has been reached.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await user.save();

    // Send welcome email (don't fail registration if email fails)
    try {
      await emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Continue with registration even if email fails
    }

    // Return user data without password
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      lastLogin: user.lastLogin
    };

    res.status(201).json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account. Please try again.'
    });
  }
});

// Login user (with rate limiting)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No account found with this email address. Please register first.'
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please try again.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data without password
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Forgot password - generate reset token and send email (with rate limiting)
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const clientIP = getClientIP(req);
    const requestTime = new Date();

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    // SECURITY: Prevent user enumeration - always respond with success
    // This prevents attackers from discovering valid email addresses
    if (!user) {
      console.warn(`⚠️ Password reset attempt for non-existent email: ${email} from IP: ${clientIP}`);

      // Return success to prevent user enumeration
      // Wait random time (100-300ms) to make timing attacks harder
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Check if there's a recent reset request (prevent spam)
    if (user.resetRequestTime && (Date.now() - user.resetRequestTime.getTime()) < 60000) {
      console.warn(`⚠️ Too frequent reset request for ${email} from IP: ${clientIP}`);
      return res.status(429).json({
        success: false,
        error: 'Please wait at least 1 minute between password reset requests.'
      });
    }

    // Generate secure random token (32 bytes = 256 bits)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in database (security best practice)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token expiry to 1 hour from now
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save hashed token, expiry, and request metadata
    user.resetToken = hashedToken;
    user.resetTokenExpiry = tokenExpiry;
    user.resetTokenUsed = false; // Mark as unused
    user.resetRequestIP = clientIP;
    user.resetRequestTime = requestTime;
    user.passwordResetCount = (user.passwordResetCount || 0) + 1;
    await user.save();

    // Log security event
    console.log(`🔐 Password reset requested for ${email} from IP: ${clientIP} (Count: ${user.passwordResetCount})`);

    // Send password reset email with original token and metadata
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName,
        clientIP,
        requestTime
      );
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
      // Clear the reset token if email fails
      user.resetToken = null;
      user.resetTokenExpiry = null;
      user.resetTokenUsed = false;
      user.resetRequestIP = null;
      user.resetRequestTime = null;
      await user.save();

      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request. Please try again.'
    });
  }
});

// Validate reset token (with rate limiting)
router.post('/validate-reset-token', tokenValidationLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    const clientIP = getClientIP(req);

    if (!token) {
      console.warn(`⚠️ Token validation attempt without token from IP: ${clientIP}`);
      return res.status(400).json({
        success: false,
        error: 'Reset token is required'
      });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this token, check if not expired and not used
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
      resetTokenUsed: false
    });

    if (!user) {
      console.warn(`⚠️ Invalid/expired/used token validation attempt from IP: ${clientIP}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    console.log(`✅ Valid token validated for ${user.email} from IP: ${clientIP}`);

    res.json({
      success: true,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('❌ Token validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate reset token'
    });
  }
});

// Reset password with token (with rate limiting)
router.post('/reset-password', passwordResetCompletionLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    const clientIP = getClientIP(req);

    // Validate input
    if (!token || !password) {
      console.warn(`⚠️ Password reset attempt with missing data from IP: ${clientIP}`);
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    // Validate password strength (without user info since we don't have user yet)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet security requirements',
        errors: passwordValidation.errors
      });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this token, check if not expired and not used (ONE-TIME USE)
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
      resetTokenUsed: false
    });

    if (!user) {
      console.warn(`⚠️ Password reset attempt with invalid/expired/used token from IP: ${clientIP}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset link.'
      });
    }

    // Optional: Verify IP matches the one that requested the reset
    // Uncomment for stricter security, but may cause issues with dynamic IPs
    // if (user.resetRequestIP && user.resetRequestIP !== clientIP) {
    //   console.warn(`⚠️ IP mismatch for password reset: Expected ${user.resetRequestIP}, got ${clientIP}`);
    //   // You could send a notification email here
    // }

    // Hash new password with high cost factor for security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password, mark token as used, and clear sensitive data
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.resetTokenUsed = true; // Mark as used to prevent reuse
    user.lastPasswordChange = new Date();
    // Keep resetRequestIP and resetRequestTime for security audit trail
    await user.save();

    // Log security event
    console.log(`✅ Password successfully reset for ${user.email} from IP: ${clientIP}`);

    // Send confirmation email
    try {
      await emailService.sendPasswordResetConfirmation(user.email, user.firstName);
    } catch (emailError) {
      console.error('❌ Confirmation email error:', emailError);
      // Don't fail the request if confirmation email fails
    }

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password. Please try again.'
    });
  }
});

// Delete user account (with rate limiting)
router.delete('/account', accountDeletionLimiter, async (req, res) => {
  try {
    const { userId, password } = req.body;
    const clientIP = getClientIP(req);

    // Validate input
    if (!userId || !password) {
      console.warn(`⚠️ Account deletion attempt with missing data from IP: ${clientIP}`);
      return res.status(400).json({
        success: false,
        error: 'User ID and password are required for account deletion'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`⚠️ Account deletion attempt for non-existent user from IP: ${clientIP}`);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password (re-authentication)
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.warn(`⚠️ Account deletion attempt with incorrect password for ${user.email} from IP: ${clientIP}`);
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please verify your password to delete your account.'
      });
    }

    // Store user info for email before deletion
    const userEmail = user.email;
    const userName = user.firstName;

    // Log security event
    console.log(`🗑️ Account deletion initiated for ${userEmail} from IP: ${clientIP}`);

    // Step 1: Delete all user's grocery lists
    const deletedLists = await GroceryList.deleteMany({ userId: user._id });
    console.log(`✅ Deleted ${deletedLists.deletedCount} grocery lists for user ${userEmail}`);

    // Step 2: Send confirmation email (before deleting user account)
    try {
      await emailService.sendAccountDeletionConfirmation(userEmail, userName);
      console.log(`✅ Account deletion confirmation email sent to ${userEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send deletion confirmation email:', emailError);
      // Continue with deletion even if email fails
      // User has already confirmed they want to delete
    }

    // Step 3: Delete user account (after email is sent)
    await User.findByIdAndDelete(user._id);
    console.log(`✅ User account deleted: ${userEmail} from IP: ${clientIP}`);

    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    });

  } catch (error) {
    console.error('❌ Account deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account. Please try again.'
    });
  }
});

export default router;