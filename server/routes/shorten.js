const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const generateCode = require('../utils/generateCode');
const isValidUrl = require('../utils/validateUrl');
const validateAlias = require('../utils/validateAlias');
const { optionalAuth } = require('../middleware/auth');

/**
 * POST /api/shorten
 * Body: { originalUrl }
 * Returns: { shortCode, shortUrl, originalUrl }
 */
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    let { originalUrl, customAlias } = req.body;

    // Validate input
    if (!originalUrl) {
      return res.status(400).json({ error: 'originalUrl is required' });
    }

    // Auto-append https protocol if missing
    if (!/^https?:\/\//i.test(originalUrl)) {
      originalUrl = 'https://' + originalUrl;
    }

    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({ error: 'Invalid URL. Must be a valid http/https URL.' });
    }

    // Check customAlias if provided
    let shortCode;
    if (customAlias) {
      customAlias = customAlias.trim().toLowerCase();
      
      if (!req.user) {
        return res.status(401).json({ error: 'Custom aliases require an account' });
      }

      const aliasError = validateAlias(customAlias);
      if (aliasError) {
        return res.status(400).json({ error: aliasError });
      }

      const conflict = await Url.findOne({ shortCode: customAlias });
      if (conflict) {
        return res.status(409).json({ error: 'This custom alias is already taken' });
      }

      shortCode = customAlias;
    }

    // Check if this URL has already been shortened (only if no custom alias is provided)
    if (!customAlias) {
      const query = { originalUrl, userId: req.user ? req.user.id : null };
      const existing = await Url.findOne(query);
      if (existing) {
        const shortUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${existing.shortCode}`;
        return res.json({
          shortCode: existing.shortCode,
          shortUrl,
          originalUrl: existing.originalUrl,
        });
      }
    }

    // Generate a unique short code if none was provided
    if (!shortCode) {
      let isUnique = false;
      while (!isUnique) {
        shortCode = generateCode();
        const conflict = await Url.findOne({ shortCode });
        if (!conflict) isUnique = true;
      }
    }

    // Save to database (attach userId if logged in)
    const urlData = { originalUrl, shortCode };
    if (req.user) {
      urlData.userId = req.user.id;
    }
    const url = new Url(urlData);
    await url.save();

    const shortUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${shortCode}`;

    res.status(201).json({
      shortCode,
      shortUrl,
      originalUrl,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
