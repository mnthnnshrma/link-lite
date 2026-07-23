const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redis = null;

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying after 3 attempts
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.connect().catch(() => {
    console.warn('⚠ Redis unavailable — running without cache');
    redis = null;
  });

  redis.on('connect', () => console.log('Connected to Redis'));
  redis.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
      console.error('Redis error:', err.message);
    }
  });
} catch (err) {
  console.warn('⚠ Redis unavailable — running without cache');
  redis = null;
}

/**
 * Safe wrapper — returns null on failure instead of throwing.
 */
const getCache = async (key) => {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 3600) => {
  if (!redis) return;
  try {
    await redis.set(key, value, 'EX', ttlSeconds);
  } catch {
    // silently ignore
  }
};

const delCache = async (key) => {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // silently ignore
  }
};

module.exports = { redis, getCache, setCache, delCache };
