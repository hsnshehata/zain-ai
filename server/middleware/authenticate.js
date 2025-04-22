const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'التوكن غير موجود' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (err) {
    let errorMessage = 'التوكن غير صالح';
    if (err.name === 'TokenExpiredError') {
      errorMessage = 'التوكن منتهي الصلاحية';
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'التوكن غير صالح أو توقيع غير صحيح';
    }
    console.error(`❌ خطأ في التحقق من التوكن: ${errorMessage}`, err.message, err.stack);
    res.status(401).json({ message: errorMessage });
  }
};
