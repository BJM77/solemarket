/* Benched seller order notifications (Firebase Cloud Messaging web push).
 * Registered on its own scope (/firebase-cloud-messaging-push-scope), separate from /sw.js.
 * Messages are data-only, so this worker shows exactly one notification per push
 * (iOS Home Screen apps require that). Works without loading the Firebase SDK. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function readPayload(event) {
  try {
    const p = event.data ? event.data.json() : {};
    const d = p.data || {};
    const n = p.notification || {};
    return {
      title: d.title || n.title || 'Benched',
      body: d.body || n.body || 'You have a new order update.',
      url: d.url || (p.fcmOptions && p.fcmOptions.link) || '/seller/dashboard?tab=orders',
      tag: d.tag || 'benched-order',
    };
  } catch (e) {
    return { title: 'Benched', body: 'You have a new order update.', url: '/seller/dashboard?tab=orders', tag: 'benched-order' };
  }
}

self.addEventListener('push', (event) => {
  const m = readPayload(event);
  event.waitUntil(
    self.registration.showNotification(m.title, {
      body: m.body,
      tag: m.tag,
      renotify: true,
      icon: '/benchedlogo.png',
      badge: '/favicon.ico',
      data: { url: m.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/seller/dashboard?tab=orders';
  // Same-origin paths only.
  const target = new URL(raw.startsWith('/') && !raw.startsWith('//') ? raw : '/seller/dashboard?tab=orders', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          return c.focus().then((w) => (w && 'navigate' in w ? w.navigate(target) : null)).catch(() => self.clients.openWindow(target));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
