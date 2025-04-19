self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('bot-manager-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard.html',
        '/css/style.css',
        '/js/auth.js',
        '/js/dashboard.js',
        '/js/bots.js',
        '/js/rules.js',
        '/js/chatPage.js',
        '/js/analytics.js',
        '/js/users.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
