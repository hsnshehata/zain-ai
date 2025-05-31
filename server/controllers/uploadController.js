const axios = require('axios');
const FormData = require('form-data');

async function uploadToImgbb(file, options = {}) {
  try {
    const maxSizeInBytes = 32 * 1024 * 1024; // 32MB
    if (file.size > maxSizeInBytes) {
      throw new Error('حجم الصورة أكبر من الحد الأقصى المسموح (32 ميجابايت)');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('نوع الصورة غير مدعوم، يرجى رفع صورة بصيغة PNG، JPEG، أو GIF');
    }

    const formData = new FormData();
    formData.append('image', file.buffer, file.originalname);
    formData.append('key', process.env.IMGBB_API_KEY);
    if (options.expiration) {
      formData.append('expiration', options.expiration);
    }

    console.log('📤 Uploading image to imgbb...');
    const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('📥 imgbb response:', response.data);

    if (response.status !== 200 || !response.data.success) {
      throw new Error(`فشل في رفع الصورة إلى imgbb: ${response.data.error?.message || 'خطأ غير معروف'}`);
    }

    return {
      url: response.data.data.url,
      thumbUrl: response.data.data.thumb.url,
      deleteUrl: response.data.data.delete_url,
    };
  } catch (err) {
    console.error('❌ Error uploading to imgbb:', err.message);
    throw err;
  }
}

module.exports = { uploadToImgbb };
