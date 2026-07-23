/**
 * Validate that a string is a well-formed, public http(s) URL.
 * Rejects non-http(s) schemes, localhost, and private/internal IP ranges.
 */
function isValidUrl(str) {
  const MAX_LENGTH = 2048;
  if (typeof str !== 'string' || str.length === 0 || str.length > MAX_LENGTH) {
    return false;
  }

  let url;
  try {
    url = new URL(str);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  // Reject localhost / loopback
  if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1') {
    return false;
  }

  // Reject private/internal IPv4 ranges (10.x, 127.x, 169.254.x, 172.16-31.x, 192.168.x)
  const privateIpPattern = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
  if (privateIpPattern.test(hostname)) {
    return false;
  }

  // Basic sanity check on hostname shape:
  // 1. Must contain at least one dot (rejects single-word hosts)
  // 2. Must only contain valid DNS characters (alphanumeric, hyphens, dots). Rejects commas, etc.
  // 3. Must not contain consecutive dots (empty labels)
  if (!hostname.includes('.') || !/^[a-z0-9.-]+$/.test(hostname) || hostname.includes('..')) {
    return false;
  }

  return true;
}

module.exports = isValidUrl;

