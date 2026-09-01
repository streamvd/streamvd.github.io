const CACHE_NAME = 'love-songs-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/radio.css',
  '/js/radio.js',
  '/manifest.json',
  '/img/album.webp',
  '/img/alert-circle-outline.svg',
  '/img/chevron-back.svg',
  '/img/checkmark-circle.svg',
  '/img/copy-outline.svg',
  '/img/logo-whatsapp.svg',
  '/img/logo-instagram.svg',
  '/img/logo-github.svg',
  '/img/play.svg',
  '/img/arrow-redo-outline.svg',
  '/img/cafe-outline.svg',
  '/img/close-outline-white.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
