const CACHE_NAME = 'dhanlaxmi-v10'; // वर्जन वाढवलं म्हणजे अपडेट होईल

const urlsToCache = [
  '/dhanlaxmi_shevai/Dhanlaxmi_App/',
  '/dhanlaxmi_shevai/Dhanlaxmi_App/index.html',
  '/dhanlaxmi_shevai/Dhanlaxmi_App/style_app.css',
  '/dhanlaxmi_shevai/Dhanlaxmi_App/script_app.js',
  '/dhanlaxmi_shevai/Dhanlaxmi_App/Logo.jpeg',
  '/dhanlaxmi_shevai/Dhanlaxmi_App/icon-192.png',
  '/dhanlaxmi_shevai/Dhanlaxmi_App/icon-512.png',
  '/dhanlaxmi_shevai/Dhanlaxmi_App/Designer.png'
];

// Install event - कॅश कर
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - जुना कॅश डिलीट कर
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - कॅश मधून दे, नसेल तर नेटवर्क वरून
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});