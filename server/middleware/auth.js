const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Auth middleware — reads a JWT from the httpOnly cookie.
 *
 * Usage:
 *   - As a required guard:  router.get('/protected', auth, handler)
 *     → returns 401 if no valid token
 *   - As an optional attach: router.post('/shorten', optionalAuth, handler)
 *     → attaches req.user if token is present, otherwise continues without it
 */
function auth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth — attaches req.user if a valid token exists,
 * but does NOT reject the request if there's no token.
 */
function optionalAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch {
    // Invalid token — just continue without req.user
  }

  next();
}

module.exports = { auth, optionalAuth };
