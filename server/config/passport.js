const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
      callbackURL: (process.env.BACKEND_URL || 'http://localhost:5000') + '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const emailObj = profile.emails && profile.emails[0];
        const email = emailObj ? emailObj.value.toLowerCase().trim() : null;
        const isEmailVerified = emailObj?.verified || profile._json?.email_verified === true || profile._json?.email_verified === 'true';

        if (!email || !isEmailVerified) {
          return done(new Error('Google account email is not verified'), null);
        }

        // 1. Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        // 2. Check if user exists with this email (Account Linking)
        user = await User.findOne({ email });
        if (user) {
          // Link the googleId to the existing account
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }

        // 3. Create a completely new user
        user = new User({
          email,
          googleId: profile.id,
        });
        await user.save();
        return done(null, user);
      } catch (err) {
        console.error('Google OAuth Error:', err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
