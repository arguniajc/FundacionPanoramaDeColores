// Service Worker — Fundación Panorama de Colores
var CACHE = 'fpc-v2';
var ASSETS = [
  '/',
  '/css/main.css',
  '/css/responsive.css',
  '/js/script.js',
  '/images/logo.png',
  '/images/favicon.ico'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Cache-first para assets locales, network-first para API
self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  // No interceptar peticiones al backend ni al panel admin
  if (url.includes('onrender.com') || url.includes('/gestion/')) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        var clone = response.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        return response;
      });
    })
  );
});
