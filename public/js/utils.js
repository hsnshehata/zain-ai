// public/js/utils.js
async function handleApiRequest(url, options, errorElement = null, errorMessagePrefix = 'خطأ') {
  try {
    const response = await fetch(url, options);
    if (response.status === 401) {
      alert('جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.');
      logoutUser(); // يفترض إن logoutUser موجودة في dashboard_new.js
      throw new Error('جلسة غير صالحة');
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `${errorMessagePrefix}: ${response.statusText}`);
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
