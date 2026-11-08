const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('REQUEST_FAILED', {
    method: req.method,
    path: req.originalUrl,
    actorId: req.user?.id ?? null,
    errorCode: err.code ?? 'INTERNAL_ERROR',
    message: err.message
  });

  // Do not expose SQL queries, credentials, or stack traces to users.
  if (res.headersSent) {
    return next(err);
  }

  const isDatabaseError = Boolean(
    err.code?.startsWith('ER_') ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'PROTOCOL_CONNECTION_LOST'
  );

  if (isDatabaseError) {
    return res.status(503).json({
      message: 'The database service is temporarily unavailable. Please try again later.'
    });
  }

  return res.status(500).json({
    message: 'An unexpected server error occurred.'
  });
}

module.exports = errorHandler;