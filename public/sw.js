// v2: network-first for pages so deploys are picked up immediately.
// v1 was cache-first for everything, which pinned phones to old builds
// (stale Server Action IDs -> "Server Action ... was not found").
const CACHE_NAME = 'benched-cache-v2';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll([OFFLINE_URL, '/favicon.ico', '/logo.svg'])).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const url = new URL(req.url);

  // Pages: always network; offline page only when the network is down.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Only immutable, content-hashed build assets are safe to serve from cache.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Everything else (RSC payloads, APIs, images): straight to network.
});
