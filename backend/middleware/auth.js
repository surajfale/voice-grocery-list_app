import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const TOKEN_EXPIRY = '7d';

/**
 * Sign a session token for a user. The token carries the user's current
 * tokenVersion (`tv`); bumping User.tokenVersion revokes every token issued
 * before the bump (password reset, account deletion).
 * @param {{ _id: unknown, tokenVersion?: number }} user
 * @returns {string} signed JWT
 */
export const generateAuthToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), tv: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: TOKEN_EXPIRY }
  );
};

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return null;
};

const unauthorized = (res, error) => res.status(401).json({ success: false, error });

/**
 * Require a valid, non-revoked session token. Attaches the authenticated user
 * id to req.userId. One indexed lookup per request: the user must still exist
 * and the token's version must match (tokens from before a password reset or
 * from a deleted account are rejected).
 */
export const authenticate = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return unauthorized(res, 'Authentication required');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return unauthorized(res, 'Invalid or expired session. Please log in again.');
  }

  try {
    const user = await User.findById(decoded.userId).select('tokenVersion').lean();
    // Tokens issued before tokenVersion existed carry no `tv`: treat as 0
    if (!user || (user.tokenVersion ?? 0) !== (decoded.tv ?? 0)) {
      return unauthorized(res, 'Your session has ended. Please log in again.');
    }
  } catch (error) {
    return next(error);
  }

  req.userId = decoded.userId;
  return next();
};

/**
 * Ensures the authenticated user matches the :userId route param.
 * Must run after authenticate.
 */
export const requireOwnUserId = (req, res, next) => {
  if (req.params.userId && req.params.userId !== req.userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Cannot access another user\'s data'
    });
  }
  return next();
};

export default { generateAuthToken, authenticate, requireOwnUserId };
