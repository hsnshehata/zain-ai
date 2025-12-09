// /server/middleware/authenticate.js

const jwt = require('jsonwebtoken');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.error(`[${getTimestamp()}] ❌ التوكن غير موجود في الطلب | Headers:`, req.headers);
    return res.status(401).json({ 
      message: 'التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى',
      error: 'NoTokenError',
      details: 'No Authorization header or Bearer token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    console.log(`[${getTimestamp()}] ✅ التوكن صحيح | User: ${decoded.userId} | Token: ${token.slice(0, 10)}...`, decoded);
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
    console.error(`[${getTimestamp()}] ❌ خطأ في التحقق من التوكن | Error: ${err.name} | Token: ${token.slice(0, 10)}...`, errorMessage, err.message, err.stack);
    res.status(401).json({ 
      message: errorMessage,
      error: err.name,
      details: errorDetails
    });
  }
};
