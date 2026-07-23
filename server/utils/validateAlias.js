const RESERVED_ALIASES = new Set([
  'api',
  'admin',
  'login',
  'signup',
  'logout',
  'help',
  'contact',
  'about',
  'terms',
  'privacy',
  'stats',
  'mine',
  'my-links',
  'settings',
  'profile',
  // basic list of potentially offensive/blocked words can be added here
  'fuck',
  'shit',
  'ass',
  'bitch',
]);

/**
 * Validates a custom alias for length, allowed characters, and reserved words.
 * Returns an error string if invalid, or null if valid.
 *
 * @param {string} alias The custom alias to check.
 * @returns {string|null} Error message or null.
 */
function validateAlias(alias) {
  if (!alias) {
    return 'Alias cannot be empty.';
  }

  // Length and character set (3-20 chars, URL safe)
  if (!/^[a-zA-Z0-9-_]{3,20}$/.test(alias)) {
    return 'Custom alias must be 3-20 characters and contain only letters, numbers, hyphens, or underscores';
  }

  // Check against blocklist (case-insensitive)
  if (RESERVED_ALIASES.has(alias.toLowerCase())) {
    return 'This custom alias is reserved or not allowed.';
  }

  return null;
}

module.exports = validateAlias;
