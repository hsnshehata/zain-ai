// public/service-worker.js

const CACHE_NAME = 'zain-ai-v0.0001'; // غيرنا الاسم عشان الكاش يتجدد
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard_new.html',
  '/chat.html',
  '/css/common.css',
  '/css/index.css',
  '/css/login.css',
  '/css/bots.css',
  '/css/rules.css',
  '/css/chatPage.css',
  '/css/analytics.css',
  '/css/feedback.css',
  '/css/facebook.css',
  '/css/messages.css',
  '/css/assistantBot.css',
  '/css/dashboard.css',
  '/css/chat.css',
  '/js/utils.js',
  '/js/landing.js',
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
  '/js/chat.js',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell:', error);
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

  // Network-first strategy for all cached assets
  if (urlsToCache.includes(pathname) || pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.png')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // If network response is valid, update cache and return response
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log(`Service Worker: Updating cache for ${pathname}`);
                cache.put(event.request, responseToCache);
              });
            console.log(`Service Worker: Serving fresh content from network for ${pathname}`);
            return networkResponse;
          }
          // If network response is not valid, fall back to cache
          return caches.match(event.request)
            .then((cacheResponse) => {
              if (cacheResponse) {
                console.log(`Service Worker: Serving cached content for ${pathname}`);
                return cacheResponse;
              }
              console.error(`Service Worker: No cache available for ${pathname}`);
              return new Response('Resource not found', { status: 404 });
            });
        })
        .catch(() => {
          // If network fails (offline), fall back to cache
          console.log(`Service Worker: Network failed, falling back to cache for ${pathname}`);
          return caches.match(event.request)
            .then((cacheResponse) => {
              if (cacheResponse) {
                return cacheResponse;
              }
              console.error(`Service Worker: Offline and no cache for ${pathname}`);
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
          return caches.match('/index.html'); // Fallback to index.html
        })
    );
  }
});
