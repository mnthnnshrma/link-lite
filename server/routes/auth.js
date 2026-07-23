const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/** Cookie options for the JWT token */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * POST /api/auth/signup
 * Body: { email, password }
 * Sets an httpOnly cookie with the JWT and returns user info.
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = new User({ email, password });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, cookieOptions);
    res.status(201).json({
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Sets an httpOnly cookie with the JWT and returns user info.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'This account was created using Google. Please log in with Google.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, cookieOptions);
    res.json({
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Clears the httpOnly cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Returns the current user from the cookie token, or 401 if not logged in.
 * Used by the frontend to restore sessions on page refresh.
 */
router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: decoded.id, email: decoded.email } });
  } catch {
    res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * GET /api/auth/google
 * Initiates the Google OAuth flow and sets a CSRF state cookie.
 */
router.get('/google', (req, res, next) => {
  const generatedState = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', generatedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/',
  });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: generatedState,
  })(req, res, next);
});

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback, verifies CSRF state, and issues the JWT.
 */
router.get('/google/callback', (req, res, next) => {
  // CSRF Protection Check
  const stateFromGoogle = req.query.state;
  const stateFromCookie = req.cookies?.oauth_state;

  if (!stateFromGoogle || !stateFromCookie || stateFromGoogle !== stateFromCookie) {
    res.clearCookie('oauth_state', { ...cookieOptions, maxAge: 0 });
    return res.status(403).json({ error: 'OAuth state mismatch (CSRF blocked)' });
  }

  passport.authenticate('google', { session: false }, (err, user, info) => {
    // Clear the temporary state cookie
    res.clearCookie('oauth_state', { ...cookieOptions, maxAge: 0 });

    if (err) {
      console.error('Google callback error:', err);
      return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/login?error=Google_Login_Failed');
    }
    if (!user) {
      return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/login?error=Unauthorized');
    }

    // Generate standard JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, cookieOptions);
    res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/?login=success');
  })(req, res, next);
});

module.exports = router;
