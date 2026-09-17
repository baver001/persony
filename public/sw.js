// Persony PWA Service Worker
const CACHE_NAME = 'persony-cache-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept cross-origin requests (Clerk FAPI, fonts, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Let browser handle API and WebSocket directly
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || Response.error();
    })
  );
});
