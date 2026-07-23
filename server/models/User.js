const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Hash the password before saving, only if it has been modified.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

/**
 * Compare a candidate password against the stored hash.
 */
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
