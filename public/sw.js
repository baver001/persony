// Simple PWA Service Worker for PersonaGram
const CACHE_NAME = 'personagram-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser handle WebSocket and API routes directly
  if (event.request.url.includes('/api/')) {
    return;
  }
  // Cache first for assets, network fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
