const CACHE_NAME = 'quant-tutor-v4';

// 1. Install and force the new worker to take over immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Wipe out any old, broken caches when the app updates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Always try the internet first for the newest code!
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});