// /server/middleware/authenticate.js

const jwt = require('jsonwebtoken');
const logger = require('../logger');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    logger.warn('auth_token_missing', { headers: req.headers });
    return res.status(401).json({
      message: 'التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى',
      error: 'NoTokenError',
      details: 'No Authorization header or Bearer token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    logger.info('auth_token_valid', { userId: decoded.userId, role: decoded.role, tokenPrefix: token.slice(0, 10) });
    next();
  } catch (err) {
    let errorMessage = 'التوكن غير صالح';
    let errorDetails = err.message;
    if (err.name === 'TokenExpiredError') {
      errorMessage = 'التوكن منتهي الصلاحية، يرجى تسجيل الدخول مرة أخرى';
      errorDetails = `Token expired at ${err.expiredAt}`;
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'التوكن غير صالح أو توقيع غير صحيح';
      errorDetails = err.message;
    }
    logger.error('auth_token_invalid', { error: err.name, tokenPrefix: token.slice(0, 10), message: errorMessage, details: err.message, stack: err.stack });
    res.status(401).json({
      message: errorMessage,
      error: err.name,
      details: errorDetails
    });
  }
};
