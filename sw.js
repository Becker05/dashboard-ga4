const CACHE_NAME = 'ga4-dash-v1';
const ASSETS = [
  '/dashboard-ga4/',
  '/dashboard-ga4/index.html',
  '/dashboard-ga4/icon-192.png',
  '/dashboard-ga4/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(c) { return c.addAll(ASSETS); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request)
      .then(function(r) { return r || fetch(e.request); })
  );
});
