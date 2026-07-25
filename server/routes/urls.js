const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const Url = require('../models/Url');
const Click = require('../models/Click');
const { auth } = require('../middleware/auth');
const { redirectLimiter } = require('../middleware/rateLimit');
const isValidUrl = require('../utils/validateUrl');
const validateAlias = require('../utils/validateAlias');
const { getCache, delCache, setCache } = require('../utils/redis');

/**
 * GET /api/urls/resolve/:code
 * Public route — resolves a short code for the interstitial landing page and logs analytics.
 */
router.get('/resolve/:code', redirectLimiter, async (req, res, next) => {
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
        return res.status(404).json({ error: 'Short URL not found or expired' });
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
          let referrer = req.query.ref !== undefined ? req.query.ref : (req.headers['referer'] || req.headers['referrer'] || '');
          // If the referrer is our own internal app domain or localhost, store as empty string so it displays as 'Direct'
          if (referrer && (referrer.includes('link-lite') || referrer.includes('localhost') || referrer.includes('onrender.com') || referrer.includes('vercel.app'))) {
            referrer = '';
          }

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

    res.json({ originalUrl, shortCode: code });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/urls/mine
 * Protected route — returns all links belonging to the logged-in user.
 */
router.get('/mine', auth, async (req, res, next) => {
  try {
    const urls = await Url.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    // Use denormalized clicks counter for ultra-fast dashboard rendering
    const formatted = urls.map((url) => ({
      ...url.toObject(),
      humanClicks: url.clicks,
      shortUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${url.shortCode}`,
    }));
    
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/urls/:id
 * Update originalUrl and/or customAlias
 */
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { originalUrl, customAlias } = req.body;
    const urlId = req.params.id;

    // Find the URL and ensure it belongs to the logged-in user
    const url = await Url.findOne({ _id: urlId, userId: req.user.id });
    if (!url) {
      return res.status(404).json({ error: 'Link not found or unauthorized' });
    }

    const oldShortCode = url.shortCode;

    if (originalUrl) {
      let finalUrl = originalUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      if (!isValidUrl(finalUrl)) {
        return res.status(400).json({ error: 'Invalid URL. Must be a valid http/https URL.' });
      }
      url.originalUrl = finalUrl;
    }

    if (customAlias !== undefined) {
      const alias = customAlias.trim().toLowerCase();
      if (alias === '') {
        return res.status(400).json({ error: 'Alias cannot be empty if provided.' });
      }
      if (alias !== url.shortCode) {
        const aliasError = validateAlias(alias);
        if (aliasError) {
          return res.status(400).json({ error: aliasError });
        }
        const conflict = await Url.findOne({ shortCode: alias });
        if (conflict) {
          return res.status(409).json({ error: 'This custom alias is already taken' });
        }
        url.shortCode = alias;
      }
    }

    await url.save();

    // Invalidate old cache entry and set the new one
    if (oldShortCode !== url.shortCode) {
      await delCache(`url:${oldShortCode}`);
    }
    await setCache(`url:${url.shortCode}`, JSON.stringify({
      originalUrl: url.originalUrl,
      userId: url.userId,
      urlId: url._id.toString(),
    }), 3600);

    res.json({
      ...url.toObject(),
      shortUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${url.shortCode}`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/urls/:id
 * Delete a link
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const urlId = req.params.id;
    const deleted = await Url.findOneAndDelete({ _id: urlId, userId: req.user.id });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Link not found or unauthorized' });
    }

    // Invalidate the Redis cache for this short code
    await delCache(`url:${deleted.shortCode}`);

    res.json({ message: 'Link deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/urls/:code/stats
 * Detailed analytics for a short link
 */
router.get('/:code/stats', auth, async (req, res, next) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code, userId: req.user.id });
    if (!url) {
      return res.status(404).json({ error: 'URL not found or unauthorized' });
    }

    const totalRawClicks = await Click.countDocuments({ urlId: url._id });
    const totalHumanClicks = await Click.countDocuments({ urlId: url._id, isBot: false });
    const totalBotClicks = totalRawClicks - totalHumanClicks;

    const clicksOverTime = await Click.aggregate([
      { $match: { urlId: url._id, isBot: false } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const deviceTypeStats = await Click.aggregate([
      { $match: { urlId: url._id, isBot: false } },
      { $group: { _id: "$deviceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const osStats = await Click.aggregate([
      { $match: { urlId: url._id, isBot: false } },
      { $group: { _id: "$os", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const referrerStats = await Click.aggregate([
      { $match: { urlId: url._id, isBot: false } },
      { $group: { _id: "$referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const countryStats = await Click.aggregate([
      { $match: { urlId: url._id, isBot: false } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      totalRawClicks,
      totalHumanClicks,
      totalBotClicks,
      clicksOverTime: clicksOverTime.map(d => ({ date: d._id, count: d.count })),
      deviceTypeStats: deviceTypeStats.map(d => ({ name: d._id, count: d.count })),
      osStats: osStats.map(d => ({ name: d._id, count: d.count })),
      referrerStats: referrerStats.map(d => ({ name: d._id || 'Direct', count: d.count })),
      countryStats: countryStats.map(d => ({ name: d._id || 'unknown', count: d.count }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
