const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Url = require('../models/Url');
const Click = require('../models/Click');
const { auth } = require('../middleware/auth');
const isValidUrl = require('../utils/validateUrl');
const validateAlias = require('../utils/validateAlias');
const { delCache, setCache } = require('../utils/redis');

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
