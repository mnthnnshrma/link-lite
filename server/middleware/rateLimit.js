const rateLimit = require('express-rate-limit');

let RedisStore;
let redisClient;

try {
  RedisStore = require('rate-limit-redis').default;
  redisClient = require('../utils/redis').redis;
} catch {
  // Redis not available — will use in-memory store
}

/**
 * Creates a rate limiter, using Redis if available, falling back to in-memory.
 */
function createLimiter({ windowMs, max, message }) {
  if (process.env.NODE_ENV !== 'production') {
    return (req, res, next) => next();
  }

  const options = {
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (RedisStore && redisClient && redisClient.status === 'ready') {
    try {
      options.store = new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
      });
    } catch {
      // fall back to in-memory
    }
  }

  return rateLimit(options);
}

/**
 * POST /api/auth/signup & /api/auth/login
 * Max 10 requests per 15 minutes per IP
 */
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts. Please try again in 15 minutes.',
});

/**
 * POST /api/shorten
 * Max 25 requests per 15 minutes per IP
 */
const shortenLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many links created. Please try again in 15 minutes.',
});

/**
 * GET /:code (redirects)
 * Max 500 requests per minute per IP
 */
const redirectLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 500,
  message: 'Too many requests. Please slow down.',
});

module.exports = { authLimiter, shortenLimiter, redirectLimiter };
