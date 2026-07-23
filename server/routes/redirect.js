const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const Click = require('../models/Click');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const { getCache, setCache } = require('../utils/redis');

/**
 * GET /:code
 * Looks up the short code and redirects (302) to the original URL.
 * Uses Redis cache for fast lookups, falls back to MongoDB on cache miss.
 * Returns 404 if the code is not found.
 */
router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    let originalUrl = null;
    let userId = null;
    let urlId = null;

    // 1. Check Redis cache first
    const cached = await getCache(`url:${code}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      originalUrl = parsed.originalUrl;
      userId = parsed.userId;
      urlId = parsed.urlId;
    }

    // 2. Cache miss — query MongoDB
    if (!originalUrl) {
      const url = await Url.findOne({ shortCode: code });

      if (!url) {
        return res.status(404).json({ error: 'Short URL not found' });
      }

      originalUrl = url.originalUrl;
      userId = url.userId;
      urlId = url._id.toString();

      // Cache the result with a 1-hour TTL
      await setCache(`url:${code}`, JSON.stringify({ originalUrl, userId, urlId }), 3600);
    }

    // Fire and forget click logging (only if the URL belongs to a registered user)
    if (userId) {
      (async () => {
        try {
          const userAgentString = req.headers['user-agent'] || '';
          const referrer = req.headers['referer'] || req.headers['referrer'] || '';

          const parser = new UAParser(userAgentString);
          const parsed = parser.getResult();

          const botRegex = /Googlebot|bingbot|curl|wget|python-requests|facebookexternalhit|Slackbot-LinkExpanding|Twitterbot/i;
          const isBot = botRegex.test(userAgentString);

          let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
          if (ip.includes(',')) ip = ip.split(',')[0];

          const geo = geoip.lookup(ip);
          const country = geo ? geo.country : 'unknown';

          const click = new Click({
            urlId,
            referrer,
            userAgent: userAgentString,
            deviceType: parsed.device.type || 'desktop',
            os: parsed.os.name || 'unknown',
            browser: parsed.browser.name || 'unknown',
            country,
            isBot,
          });

          await click.save();

          // Denormalize: Increment the click counter directly on the Url document for fast dashboard queries
          if (!isBot) {
            await Url.updateOne({ _id: urlId }, { $inc: { clicks: 1 } });
          }
        } catch (err) {
          console.error('Failed to log click:', err);
        }
      })();
    }

    res.redirect(302, originalUrl);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
