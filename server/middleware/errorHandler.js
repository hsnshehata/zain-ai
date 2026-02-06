const logger = require('../logger');
const path = require('path');

function normalizeError(err) {
  const normalized = { ...err };
  normalized.statusCode = err.statusCode || err.status || 500;
  normalized.code = err.code || 'INTERNAL_ERROR';
  normalized.message = err.message || 'حدث خطأ غير متوقع';
  return normalized;
}

module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const traceId = req.requestId || `${Date.now()}`;
  const normalized = normalizeError(err);

  // معالجة أخطاء التحقق الشائعة
  if (err.name === 'ValidationError') {
    normalized.statusCode = 400;
    normalized.code = 'VALIDATION_ERROR';
  }
  if (err.name === 'CastError') {
    normalized.statusCode = 400;
    normalized.code = 'BAD_ID_FORMAT';
  }

  const responsePayload = {
    message: normalized.message,
    code: normalized.code,
    traceId,
  };

  logger.error('unhandled_error', {
    traceId,
    code: normalized.code,
    statusCode: normalized.statusCode,
    err: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // إذا كان 404 ومش API request، أرسل صفحة 404.html
  if (normalized.statusCode === 404 && !req.originalUrl.startsWith('/api/')) {
    return res.status(404).sendFile(path.join(__dirname, '..', '..', 'public', '404.html'));
  }

  res.status(normalized.statusCode).json(responsePayload);
};
