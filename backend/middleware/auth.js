import jwt from 'jsonwebtoken';

const TOKEN_EXPIRY = '7d';

/**
 * Sign a session token for a given user id.
 * @param {string} userId
 * @returns {string} signed JWT
 */
export const generateAuthToken = (userId) => {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY
  });
};

const extractToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return null;
};

/**
 * Require a valid session token. Attaches the authenticated user id to req.userId.
 */
export const authenticate = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.'
    });
  }
};

/**
 * Same as authenticate, but also accepts the token via `?token=` query string.
 * Needed for endpoints loaded directly by the browser (e.g. <img src>) where
 * an Authorization header cannot be set.
 */
export const authenticateFlexible = (req, res, next) => {
  if (!extractToken(req) && req.query && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return authenticate(req, res, next);
};

/**
 * Ensures the authenticated user matches the :userId route param.
 * Must run after authenticate/authenticateFlexible.
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

export default { generateAuthToken, authenticate, authenticateFlexible, requireOwnUserId };
