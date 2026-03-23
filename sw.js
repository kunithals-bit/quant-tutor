const CACHE_NAME = 'quant-tutor-v2';

// Install the service worker and cache the app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/quant-tutor/',
        '/quant-tutor/index.html',
        '/quant-tutor/manifest.json'
      ]);
    })
  );
});

// Serve cached files when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});