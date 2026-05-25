// Service Worker — Fundación Panorama de Colores
// Estrategia: HTML siempre de la red (cambios visibles de inmediato)
//             CSS/JS/imágenes desde caché (carga rápida)
var CACHE = 'fpc-assets-v1';
var STATIC_ASSETS = [
  '/css/main.css',
  '/css/responsive.css',
  '/js/script.js',
  '/images/logo.png',
  '/images/favicon.ico'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(STATIC_ASSETS); })
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

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);

  // No interceptar backend ni panel admin
  if (url.hostname.includes('onrender.com') || url.pathname.startsWith('/gestion/')) return;

  // HTML — network-first: siempre intenta la red, fallback a caché si no hay conexión
  if (req.mode === 'navigate' || req.headers.get('Accept').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
          return res;
        })
        .catch(function () { return caches.match(req); })
    );
    return;
  }

  // Assets (CSS, JS, imágenes) — cache-first: respuesta instantánea
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
        return res;
      });
    })
  );
});
