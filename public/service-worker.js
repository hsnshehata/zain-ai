const CACHE_NAME = 'zain-ai-v2'; // Incremented version
const urlsToCache = [
  '/', // This should now point to the new landing page (index.html)
  '/index.html', // Explicitly cache the landing page
  '/login.html', // Cache the login page
  '/dashboard_new.html', // Cache the new dashboard
  // CSS Files
  '/css/base.css', // Assuming base is still used
  '/css/landing.css',
  '/css/login.css', // Assuming login has its own CSS or uses base
  '/css/dashboard_new.css',
  '/css/components.css', // If still used by new dashboard
  '/css/chat-modal.css',
  '/css/analytics.css',
  '/css/feedback.css',
  '/css/facebook.css',
  '/css/messages.css',
  '/css/rules.css',
  // JS Files
  '/js/landing.js',
  '/js/auth.js',
  '/js/dashboard_new.js',
  '/js/bots.js',
  '/js/rules.js',
  '/js/chatPage.js',
  '/js/analytics.js',
  '/js/users.js',
  '/js/feedback.js',
  '/js/facebook.js',
  '/js/messages.js',
  // Potentially other assets like icons, manifest
  '/manifest.json',
  '/favicon.ico',
  // Add paths to icons if they are critical
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Use addAll for atomic caching
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Remove old caches
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
  return self.clients.claim(); // Take control immediately
});

self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetching', event.request.url);
  // Cache-First strategy for app shell assets
  // Network-first or stale-while-revalidate might be better for API calls
  if (urlsToCache.includes(new URL(event.request.url).pathname) || event.request.url.endsWith('.css') || event.request.url.endsWith('.js')) {
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            if (response) {
              // console.log('Service Worker: Found in cache', event.request.url);
              return response; // Return cached response
            }
            // console.log('Service Worker: Not in cache, fetching', event.request.url);
            // Not in cache, fetch from network, cache, and return
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                // Clone the response because it's a stream and can only be consumed once
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                return networkResponse;
            }).catch(error => {
                console.error('Service Worker: Fetch failed; returning offline page instead.', error);
                // Optionally return a fallback offline page
                // return caches.match('/offline.html');
            });
          })
      );
  } else {
      // For API calls or other requests, just fetch from network
      // console.log('Service Worker: Bypassing cache for', event.request.url);
      event.respondWith(fetch(event.request));
  }
});

