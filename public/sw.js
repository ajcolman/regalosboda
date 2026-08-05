/* Service worker: sólo Web Push. No cachea nada ni intercepta fetch. */

// Toma el control apenas se instala, sin esperar a que cierren las pestañas.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Nuevo regalo', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Nuevo regalo';
  const url = data.url || '/admin';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      // Sin tag: cada regalo llega como notificación propia y no se pisan entre sí.
      timestamp: data.timestamp || Date.now(),
      data: { url },
      // En Android hace vibrar; en el resto se ignora sin error.
      vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Si el panel ya está abierto lo enfoca en vez de abrir otra ventana.
      for (const client of list) {
        if (client.url.includes('/admin') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
