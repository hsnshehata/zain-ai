// public/service-worker.js

const CACHE_NAME = 'zain-ai-v0.0008'; // bump: تفريغ الكاش القديم + تطبيق سياسة عدم كاش للصور والروابط الخارجية
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard_new.html',
  '/css/common.css',
  '/css/landing-base.css',
  '/css/index.css',
  '/css/login.css',
  '/css/bots.css',
  '/css/rules.css',
  '/css/analytics.css',
  '/css/feedback.css',
  '/css/facebook.css',
  '/css/messages.css',
  '/css/assistantBot.css',
  '/css/dashboard.css',
  '/css/font-awesome.min.css', // Local Font Awesome CSS as fallback
  '/js/utils.js',
  '/js/store-landing.js',
  '/js/store-router.js',
  '/js/auth.js',
  '/js/dashboard_new.js',
  '/js/bots.js',
  '/js/rules.js',
  '/js/chatPage.js',
  '/js/analytics.js',
  '/js/feedback.js',
  '/js/facebook.js',
  '/js/messages.js',
  '/js/assistantBot.js',
  '/js/instagram.js',
  '/js/whatsapp.js',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // ملاحظـة: تم إزالة أي روابط خارجية من الـ pre-cache لتجنّب الكاش للموارد الخارجية
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache)
          .catch(error => {
            console.error('Service Worker: Failed to cache resource:', error);
          });
      })
      .catch(error => {
        console.error('Service Worker: Failed to open cache:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const pathname = requestUrl.pathname;
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const dest = event.request.destination;

  // 1) الصور: ممنوع تتحط في أي كاش وممنوع تتقري من الكاش
  // هنستخدم network fetch مع cache: 'no-store' دايمًا علشان كل مرة تتحمل من السيرفر
  if (dest === 'image') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => {
          // لو الشبكة وقعت مفيش fallback للصور (حسب الطلب: الصور لازم تتجاب من الشبكة)
          console.warn('Service Worker: Image fetch failed (no-store)', event.request.url);
          return new Response('', { status: 504, statusText: 'Image fetch failed' });
        })
    );
    return;
  }

  // تجاهل أي طلبات للـ /chat/ وخلّيها تتحمل من الشبكة دايمًا
  if (pathname.startsWith('/chat/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log(`Service Worker: Network failed for ${pathname}, no fallback for chat page`);
          return new Response('الصفحة غير متاحة حاليًا، حاول مرة أخرى.', { status: 503 });
        })
    );
    return;
  }

  // 2) أي روابط خارجية (Cross-Origin): لا كاش نهائيًا
  if (!isSameOrigin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => {
          console.warn('Service Worker: External request failed (no-store)', event.request.url);
          return new Response('External resource unavailable', { status: 502 });
        })
    );
    return;
  }

  // Network-first strategy for cached assets, fonts, and external resources
  if (
    urlsToCache.includes(event.request.url) || // ملفات في urlsToCache
    urlsToCache.includes(pathname) || // ملفات محلية
    pathname.endsWith('.css') || // أي ملف CSS
    pathname.endsWith('.js') || // أي ملف JS
    pathname.endsWith('.woff2') || // خطوط محلية فقط
    pathname.endsWith('.woff') // خطوط محلية فقط
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // نحفظ في الكاش فقط للموارد المحلية غير الصور
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log(`Service Worker: Updating cache for ${event.request.url}`);
                cache.put(event.request, responseToCache);
              });
            console.log(`Service Worker: Serving fresh content from network for ${event.request.url}`);
            return networkResponse;
          }
          // If network response is not valid, fall back to cache
          return caches.match(event.request)
            .then((cacheResponse) => {
              if (cacheResponse) {
                console.log(`Service Worker: Serving cached content for ${event.request.url}`);
                return cacheResponse;
              }
              // لو الملف خارجي، بلاش نطبع لوج مضلل
              if (isSameOrigin) {
                console.error(`Service Worker: No cache available for ${event.request.url}`);
              }
              return new Response('Resource not found', { status: 404 });
            });
        })
        .catch(() => {
          // If network fails (offline), fall back to cache
          console.log(`Service Worker: Network failed, falling back to cache for ${event.request.url}`);
          return caches.match(event.request)
            .then((cacheResponse) => {
              if (cacheResponse) {
                return cacheResponse;
              }
              console.error(`Service Worker: Offline and no cache for ${event.request.url}`);
              return caches.match('/index.html'); // Fallback to index.html
            });
        })
    );
  } else {
    // Network-first for API calls or non-cached resources
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log(`Service Worker: Network failed for non-cached resource ${pathname}, falling back to index.html`);
          return caches.match('/index.html');
        })
    );
  }
});
