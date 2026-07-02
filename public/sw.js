// MumbaiRainWatch — Service Worker
// Handles push notifications even when app is closed

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// ── Handle incoming push ──────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'MumbaiRainWatch', body: 'New alert for Mumbai', alertLevel: 'yellow' };

  try {
    data = e.data.json();
  } catch {}

  const icons = {
    red:    '🔴',
    orange: '🟠',
    yellow: '🟡',
    green:  '🟢',
  };

  const colors = {
    red:    '#ef4444',
    orange: '#f97316',
    yellow: '#f59e0b',
    green:  '#10b981',
  };

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icon-192.png',
      badge:   '/badge-72.png',
      tag:     'mumbairainwatch-alert',
      renotify: true,
      vibrate: data.alertLevel === 'red' ? [200, 100, 200, 100, 200] : [200, 100, 200],
      data:    { url: 'https://mumbairainwatch.com', alertLevel: data.alertLevel },
      actions: [
        { action: 'open',   title: '🌧️ Check Status' },
        { action: 'close',  title: 'Dismiss' },
      ]
    })
  );
});

// ── Handle notification click ─────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action === 'close') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('mumbairainwatch.com') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('https://mumbairainwatch.com');
    })
  );
});
