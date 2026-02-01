class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true, meta = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
