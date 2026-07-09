const CACHE_NAME = 'streamfetch-v2';
const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json'
];

// Instalação do Service Worker e Cache dos ficheiros estáticos
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Limpeza de caches antigos quando houver atualizações
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;

  if (request.method !== 'GET') {
    e.respondWith(fetch(request));
    return;
  }

  if (request.url.includes('/api/')) {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  e.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});
