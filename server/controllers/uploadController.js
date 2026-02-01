const axios = require('axios');
const FormData = require('form-data');
const logger = require('../logger');

async function uploadToImgbb(file, options = {}) {
  try {
    // التحقق من وجود مفتاح API
    if (!process.env.IMGBB_API_KEY) {
      logger.error('imgbb_missing_api_key');
      throw new Error('مفتاح API لـ imgbb غير موجود. تأكد من إعدادات البيئة.');
    }

    // التحقق من حجم الصورة
    const maxSizeInBytes = 32 * 1024 * 1024; // 32MB
    if (!file.buffer || file.size === 0) {
      logger.warn('imgbb_invalid_file_empty');
      throw new Error('الصورة غير صالحة أو فاضية');
    }
    if (file.size > maxSizeInBytes) {
      logger.warn('imgbb_file_too_large', { size: file.size });
      throw new Error('حجم الصورة أكبر من الحد الأقصى المسموح (32 ميجابايت)');
    }

    // التحقق من نوع الصورة
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      logger.warn('imgbb_invalid_type', { mimetype: file.mimetype });
      throw new Error('نوع الصورة غير مدعوم، يرجى رفع صورة بصيغة PNG، JPEG، أو GIF');
    }

    // إنشاء FormData
    const formData = new FormData();
    const base64Image = file.buffer.toString('base64');
      formData.append('image', base64Image);
      formData.append('name', options.name || file.originalname.replace(/\.[^/.]+$/, '') || 'store-image');
    formData.append('key', process.env.IMGBB_API_KEY);
    if (options.expiration) {
      formData.append('expiration', options.expiration);
    }

    logger.info('imgbb_upload_start', { originalname: file.originalname, mimetype: file.mimetype, size: file.size });

    // محاولة رفع الصورة مع retry mechanism
    let attempts = 3;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 20000, // زيادة الـ timeout لـ 20 ثانية
        });

        logger.info('imgbb_upload_response', { response: response.data });

        // التحقق من نجاح الطلب
        if (response.status !== 200 || !response.data.success) {
          const errorMessage = response.data.error?.message || 'خطأ غير معروف';
          logger.error('imgbb_upload_failed', { errorMessage });
          throw new Error(`فشل في رفع الصورة إلى imgbb: ${errorMessage}`);
        }

        const data = response.data.data;
        // direct/original link is under image.url; display_url can be a compressed/preview version
        const directUrl = data.image?.url || data.url || data.display_url;
        return {
          url: directUrl,
          displayUrl: data.display_url,
          thumbUrl: data.thumb?.url || data.medium?.url,
          deleteUrl: data.delete_url,
        };
      } catch (err) {
        lastError = err;
        logger.warn('imgbb_attempt_failed', { attempt: i + 1, err: err.message });
        if (err.code === 'ECONNABORTED') {
          logger.warn('imgbb_retry_timeout');
          continue; // إعادة المحاولة لو الخطأ timeout
        }
        throw err; // رمي الخطأ لو مش timeout
      }
    }

    // لو فشلت كل المحاولات
    logger.error('imgbb_all_attempts_failed');
    throw new Error(`فشل في رفع الصورة بعد ${attempts} محاولات: ${lastError.message}`);
  } catch (err) {
    logger.error('imgbb_upload_error', { err: err.message, stack: err.stack });
    throw new Error(`خطأ في رفع الصورة: ${err.message}`);
  }
}

module.exports = { uploadToImgbb };
