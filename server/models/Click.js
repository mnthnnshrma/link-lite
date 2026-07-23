const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Url',
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  referrer: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  deviceType: {
    type: String,
    default: 'desktop',
  },
  os: {
    type: String,
    default: 'unknown',
  },
  browser: {
    type: String,
    default: 'unknown',
  },
  country: {
    type: String,
    default: 'unknown',
  },
  isBot: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Click', clickSchema);
