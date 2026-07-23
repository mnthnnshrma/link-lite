/**
 * Global error handling middleware.
 * Catches any unhandled errors and returns a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  console.error(err.stack || err);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  // MongoDB Duplicate Key Error (e.g., unique alias/email conflict)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ error: `An entry with this ${field} already exists.` });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
  });
}

module.exports = errorHandler;

