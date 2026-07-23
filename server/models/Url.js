const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for performance optimization
// Dashboard: find a user's URLs in newest-first order
urlSchema.index({ userId: 1, createdAt: -1 });
// Deduplication: check if the user already shortened this URL
urlSchema.index({ userId: 1, originalUrl: 1 });

module.exports = mongoose.model('Url', urlSchema);
