const CACHE_NAME = 'briefing-hub-cache-v3'; // Increment version to clear old caches
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  // NOTE: Add other static assets like JS/CSS chunks if your bundler creates them
];

// On install, cache the static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
  self.skipWaiting();
});

// On activate, clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// On fetch, apply caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // **Strategy 0: Do not cache the refresh endpoint**
  if (url.pathname === '/api/refresh') {
    // Bypass the cache and go directly to the network.
    // Do not cache the response.
    return; 
  }

  // Strategy 1: Stale-While-Revalidate for API GET requests
  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // Fetch from network in the background
          const fetchPromise = fetch(request).then(networkResponse => {
            // If we get a valid response, update the cache
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(error => {
            console.error('Service Worker: Fetch failed', error);
          });

          // Return cached response immediately if available, otherwise wait for the network
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy 2: Cache-First for static assets
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Default: Network-first for all other requests
});