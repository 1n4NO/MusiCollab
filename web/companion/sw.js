const APP_VERSION = '0.1.0';
const CACHE = `musicollab-companion-v${APP_VERSION}`;
const APP_SHELL = [`/companion/?v=${APP_VERSION}`, `/companion/manifest.webmanifest?v=${APP_VERSION}`];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return caches.match(event.request) || caches.match(`/companion/?v=${APP_VERSION}`);
    }
  })());
});
