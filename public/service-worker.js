// public/service-worker.js

const CACHE_NAME = 'zain-ai-v0.0007'; // bump لتجديد الكاش (إصلاح تحميل صور PNG الخارجية)
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
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', // Font Awesome CSS
  // Font Awesome Fonts
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-brands-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-brands-400.woff',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff',
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

  // Network-first strategy for cached assets, fonts, and external resources
  if (
    urlsToCache.includes(event.request.url) || // ملفات في urlsToCache (بما فيها Font Awesome و Fonts)
    urlsToCache.includes(pathname) || // ملفات محلية
    pathname.endsWith('.css') || // أي ملف CSS
    pathname.endsWith('.js') || // أي ملف JS
    (isSameOrigin && pathname.endsWith('.png')) || // صور PNG محلية فقط (تجاهل الخارجية عشان استجابة opaque)
    pathname.endsWith('.woff2') || // Font Awesome Fonts
    pathname.endsWith('.woff') // Font Awesome Fonts
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // اعتبر الاستجابة صالحة لو status 200 أو نوعها opaque (Cross-Origin بدون فشل)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
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
              // Fallback to local Font Awesome CSS if CDN fails
              if (event.request.url.includes('font-awesome')) {
                console.log(`Service Worker: Font Awesome CDN failed, serving local fallback`);
                return caches.match('/css/font-awesome.min.css')
                  .then((localResponse) => {
                    if (localResponse) {
                      return localResponse;
                    }
                    console.error(`Service Worker: No local fallback available for Font Awesome`);
                    return new Response('Font Awesome not available', { status: 404 });
                  });
              }
              console.error(`Service Worker: No cache available for ${event.request.url}`);
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
              // Fallback to local Font Awesome CSS if CDN fails
              if (event.request.url.includes('font-awesome')) {
                console.log(`Service Worker: Font Awesome CDN failed (offline), serving local fallback`);
                return caches.match('/css/font-awesome.min.css')
                  .then((localResponse) => {
                    if (localResponse) {
                      return localResponse;
                    }
                    console.error(`Service Worker: No local fallback available for Font Awesome (offline)`);
                    return new Response('Font Awesome not available', { status: 404 });
                  });
              }
              console.error(`Service Worker: Offline and no cache for ${event.request.url}`);
              return caches.match('/index.html'); // Fallback to index.html
            });
        })
    );
  } else {
    // السماح بتمرير صور PNG الخارجية مباشرة بدون اعتراض (عشان ما نرجعش 404 أول مرة)
    if (!isSameOrigin && pathname.endsWith('.png')) {
      return; // المتصفح هيكمل عادي network fetch
    }
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
