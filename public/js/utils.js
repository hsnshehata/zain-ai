// public/js/utils.js
async function handleApiRequest(url, options, errorElement = null, errorMessagePrefix = 'خطأ') {
  try {
    // تحقق سريع من صلاحية التوكن وتحديث الهيدر إن وجد لتفادي استخدام توكن منتهي
    if (typeof ensureValidSession === 'function') {
      const validToken = ensureValidSession();
      if (options && options.headers && Object.prototype.hasOwnProperty.call(options.headers, 'Authorization')) {
        if (!validToken) {
          const expiredErr = new Error('انتهت صلاحية الجلسة، برجاء تسجيل الدخول مرة أخرى');
          expiredErr.status = 401;
          throw expiredErr;
        }
        options.headers.Authorization = `Bearer ${validToken}`;
      }
    }

    const response = await fetch(url, options);
    if (response.status === 401 || response.status === 403) {
      alert('جلسة غير صالحة أو غير مصرح لك، يرجى تسجيل الدخول مرة أخرى.');
      if (typeof logoutUser === 'function') {
        logoutUser();
      } else {
        // احتياطي لو لم تُحمَّل الدالة بعد
        localStorage.clear();
        window.location.href = '/login.html';
      }
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

// خفيف: أدوات كاش موحدة للصفحات
const PAGE_CACHE_VERSION = 'v1';
const buildPageCacheKey = (page, botId) => `zain-cache-${PAGE_CACHE_VERSION}:${page}:${botId || 'global'}`;

function readPageCache(page, botId, maxAgeMs = 5 * 60 * 1000) {
  try {
    const key = buildPageCacheKey(page, botId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.cachedAt) return null;
    if (Date.now() - parsed.cachedAt > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to read cache for', page, err);
    return null;
  }
}

function writePageCache(page, botId, payload) {
  try {
    localStorage.setItem(buildPageCacheKey(page, botId), JSON.stringify({
      ...payload,
      cachedAt: Date.now(),
    }));
  } catch (err) {
    console.warn('Failed to write cache for', page, err);
  }
}

window.readPageCache = readPageCache;
window.writePageCache = writePageCache;

// إدارة الجلسة والتوكن مع صلاحية زمنية بسيطة في الفرونت
const TOKEN_KEY = 'token';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const DEFAULT_TOKEN_TTL_MS = 60 * 60 * 1000; // ساعة افتراضية

function clearAuthSession() {
  ['token', 'tokenExpiry', 'role', 'userId', 'username', 'selectedBotId', 'theme'].forEach((k) => localStorage.removeItem(k));
}

function saveAuthSession(session, ttlMs = DEFAULT_TOKEN_TTL_MS) {
  if (!session || !session.token) return;
  const expiry = session.expiryMs ? session.expiryMs : Date.now() + ttlMs;
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, `${expiry}`);
  if (session.role) localStorage.setItem('role', session.role);
  if (session.userId) localStorage.setItem('userId', session.userId);
  if (session.username) localStorage.setItem('username', session.username);
}

function getAuthToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const expiryRaw = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const expiry = expiryRaw ? parseInt(expiryRaw, 10) : null;
  if (expiry && Date.now() > expiry) {
    clearAuthSession();
    return null;
  }
  return token;
}

function ensureValidSession() {
  const rawToken = localStorage.getItem(TOKEN_KEY);
  const validToken = getAuthToken();
  if (rawToken && !validToken) {
    alert('انتهت صلاحية الجلسة، برجاء تسجيل الدخول مرة أخرى.');
    window.location.href = '/login.html';
    throw new Error('انتهت الجلسة');
  }
  return validToken;
}

window.saveAuthSession = saveAuthSession;
window.getAuthToken = getAuthToken;
window.clearAuthSession = clearAuthSession;
window.ensureValidSession = ensureValidSession;
