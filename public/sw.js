// GoMatch Service Worker for Push Notifications & Background Sync
const CACHE_NAME = 'gomatch-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push messages
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'GoMatch FC', body: event.data.text() };
    }
  }

  const title = data.title || 'GoMatch FC ⚽';
  const options = {
    body: data.body || 'إشعار جديد من منصة GoMatch',
    icon: data.icon || '/images/brand/gomatch_logo_192.png',
    badge: '/images/brand/gomatch_logo_192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'gomatch-notification',
    data: data.data || { url: '/' },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click on phone/desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there is already a window/tab open with the app
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          if (event.notification.data && event.notification.data.matchId) {
            client.postMessage({
              type: 'GOMATCH_OPEN_MATCH',
              matchId: event.notification.data.matchId,
            });
          }
          return;
        }
      }
      // If not open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
