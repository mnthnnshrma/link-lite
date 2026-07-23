const crypto = require('crypto');

const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a random base62 string of the given length (default 7).
 */
function generateCode(length = 7) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += BASE62_CHARS[bytes[i] % 62];
  }
  return code;
}

module.exports = generateCode;
