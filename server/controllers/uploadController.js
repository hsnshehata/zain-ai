const axios = require('axios');
const FormData = require('form-data');

async function uploadToImgbb(file, options = {}) {
  try {
    // التحقق من وجود مفتاح API
    if (!process.env.IMGBB_API_KEY) {
      console.error('❌ IMGBB_API_KEY is not defined in environment variables');
      throw new Error('مفتاح API لـ imgbb غير موجود. تأكد من إعدادات البيئة.');
    }

    // التحقق من حجم الصورة
    const maxSizeInBytes = 32 * 1024 * 1024; // 32MB
    if (!file.buffer || file.size === 0) {
      console.error('❌ Invalid file: File is empty or buffer is missing');
      throw new Error('الصورة غير صالحة أو فاضية');
    }
    if (file.size > maxSizeInBytes) {
      console.error(`❌ File size exceeds limit: ${file.size} bytes`);
      throw new Error('حجم الصورة أكبر من الحد الأقصى المسموح (32 ميجابايت)');
    }

    // التحقق من نوع الصورة
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      console.error(`❌ Invalid file type: ${file.mimetype}`);
      throw new Error('نوع الصورة غير مدعوم، يرجى رفع صورة بصيغة PNG، JPEG، أو GIF');
    }

    // إنشاء FormData
    const formData = new FormData();
    formData.append('image', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    formData.append('key', process.env.IMGBB_API_KEY);
    if (options.expiration) {
      formData.append('expiration', options.expiration);
    }

    console.log('📤 Uploading image to imgbb with file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // إرسال الطلب إلى imgbb
    const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 10000, // إضافة timeout لتجنب الانتظار الطويل
    });

    console.log('📥 imgbb response:', response.data);

    // التحقق من نجاح الطلب
    if (response.status !== 200 || !response.data.success) {
      const errorMessage = response.data.error?.message || 'خطأ غير معروف';
      console.error(`❌ imgbb upload failed: ${errorMessage}`);
      throw new Error(`فشل في رفع الصورة إلى imgbb: ${errorMessage}`);
    }

    return {
      url: response.data.data.url,
      thumbUrl: response.data.data.thumb.url,
      deleteUrl: response.data.data.delete_url,
    };
  } catch (err) {
    console.error('❌ Error uploading to imgbb:', err.message, err.stack);
    throw new Error(`خطأ في رفع الصورة: ${err.message}`);
  }
}

module.exports = { uploadToImgbb };
