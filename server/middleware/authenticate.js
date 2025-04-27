const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.error('❌ التوكن غير موجود في الطلب:', req.headers);
    return res.status(401).json({ message: 'التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    console.log('✅ التوكن صحيح:', decoded);
    next();
  } catch (err) {
    let errorMessage = 'التوكن غير صالح';
    if (err.name === 'TokenExpiredError') {
      errorMessage = 'التوكن منتهي الصلاحية، يرجى تسجيل الدخول مرة أخرى';
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'التوكن غير صالح أو توقيع غير صحيح';
    }
    console.error(`❌ خطأ في التحقق من التوكن: ${errorMessage}`, err.message, err.stack);
    res.status(401).json({ message: errorMessage });
  }
};
