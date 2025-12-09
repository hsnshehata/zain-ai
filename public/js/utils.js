// public/js/utils.js
async function handleApiRequest(url, options, errorElement = null, errorMessagePrefix = 'خطأ') {
  try {
    const response = await fetch(url, options);
    if (response.status === 401 || response.status === 403) {
      alert('جلسة غير صالحة أو غير مصرح لك، يرجى تسجيل الدخول مرة أخرى.');
      logoutUser(); // يفترض إن logoutUser موجودة في dashboard_new.js
      const error = new Error('جلسة غير صالحة');
      error.status = response.status;
      throw error;
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMessage = errData.message || `${errorMessagePrefix}: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status; // إضافة status code للخطأ
      throw error;
    }
    return await response.json();
  } catch (err) {
    console.error(`${errorMessagePrefix}:`, err);
    if (errorElement) {
      errorElement.textContent = err.message || `${errorMessagePrefix} في الاتصال بالخادم`;
      errorElement.style.display = 'block';
    }
    throw err;
  }
}

// تصدير الدالة
window.handleApiRequest = handleApiRequest;
