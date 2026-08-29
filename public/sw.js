const CACHE_STATIC_NAME = 'genuine-static-v7';
const CACHE_DATA_NAME = 'genuine-data-v7';
const CACHE_IMAGES_NAME = 'genuine-images-v7';
const MAX_IMAGE_ENTRIES = 120;

// Helper: Trim cache to limit entries
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      trimCache(cacheName, maxItems);
    }
  } catch (e) {
    // Ignore cache trim errors
  }
}

const STATIC_PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-48x48.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-192.png',
  '/icon-maskable-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Poppins:wght@400;500;600;700&display=swap'
];

// Install Event: Precaching essential shell & activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      console.log('[Service Worker] Precaching critical offline shell assets');
      return cache.addAll(STATIC_PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Pre-cache partial failure (non-blocking):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up legacy caches & take immediate control of clients
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_STATIC_NAME, CACHE_DATA_NAME, CACHE_IMAGES_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[Service Worker] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Network with timeout fallback
function fetchWithTimeout(request, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network request timed out'));
    }, timeoutMs);

    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Fetch Event: Offline caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore Vite development server internal paths, source files, and HMR
  if (url.pathname.startsWith('/@') || 
      url.pathname.startsWith('/src/') || 
      url.pathname.startsWith('/node_modules/') ||
      url.searchParams.has('t') ||
      url.searchParams.has('v')) {
    return;
  }

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (HTML SPA Routing) -> Network First with cached index.html fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetchWithTimeout(request, 3500)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[Service Worker] Offline navigation fallback for:', request.url);
          const cachedDoc = await caches.match(request);
          if (cachedDoc) return cachedDoc;
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return new Response('<h1>Offline</h1><p>Genuine Electronics is currently offline. Please check your internet connection.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 2. Product Data & Store API Requests (/api/data/*, /api/store/*, Supabase REST) -> Network First with cached data fallback
  const isApiData = url.pathname.startsWith('/api/data/') || 
                    url.pathname.startsWith('/api/store/') || 
                    (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/'));

  if (isApiData) {
    event.respondWith(
      fetchWithTimeout(request, 4000)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_DATA_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[Service Worker] Serving cached API product/store data for:', request.url);
          const cachedData = await caches.match(request);
          if (cachedData) {
            return cachedData;
          }
          return new Response(JSON.stringify({ data: [], cached: false, offline: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 3. Product & Brand Images (Unsplash, Supabase Storage, local images) -> Stale-While-Revalidate
  const isImage = request.destination === 'image' || 
                  url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|avif)$/i) ||
                  url.hostname.includes('images.unsplash.com') ||
                  url.hostname.includes('cloudinary.com') ||
                  url.pathname.includes('/storage/v1/object/public/');

  if (isImage) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_IMAGES_NAME).then((cache) => {
                cache.put(request, responseClone);
                trimCache(CACHE_IMAGES_NAME, MAX_IMAGE_ENTRIES);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Static Code & Style Assets (JS, CSS, Fonts, Icons) -> Stale-While-Revalidate
  const isStaticAsset = url.pathname.startsWith('/assets/') ||
                        url.pathname.endsWith('.js') ||
                        url.pathname.endsWith('.css') ||
                        url.hostname.includes('fonts.googleapis.com') ||
                        url.hostname.includes('fonts.gstatic.com') ||
                        url.hostname.includes('flagcdn.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// Listen for message events (e.g., skip waiting or cache clear)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});
