const CACHE_NAME = 'dhanlaxmi-admin-v2';
const urlsToCache = [
  './',
  './admin.html',
  './login.html',
  './admin.css',
  './admin.js',
  './auth.js',
  './accounts.html',
  './accounts.css',
  './accounts.js',
  './change_password.html',
  './invoice.html',
  './invoice.css',
  './icon-192.png',
  './icon-512.png',
  './Designer.png',
  './Logo.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});