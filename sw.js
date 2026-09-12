const CACHE_NAME = 'ga4-dash-v2';
const ASSETS = [
  './android-chrome-192x192.png',
  './android-chrome-512x512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(c) { return c.addAll(ASSETS); }).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k.startsWith('ga4-dash-') && k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', function(e) {
  // Never cache API requests, tokens, reports, HTML or application modules.
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.endsWith('.png'))return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
