// public/service-worker.js

const CACHE_NAME = 'zain-ai-v5'; // غيرنا الاسم عشان الكاش يتجدد
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard_new.html',
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

  // Cache-first strategy for app shell assets
  if (urlsToCache.includes(pathname) || pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }).catch(() => {
            console.error('Service Worker: Fetch failed; returning offline page.');
            return caches.match('/index.html'); // Fallback to index.html
          });
        })
    );
  } else {
    // Network-first for API calls or non-cached resources
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html'); // Fallback to index.html
      })
    );
  }
});
