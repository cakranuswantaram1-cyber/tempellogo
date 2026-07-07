const CACHE_NAME = 'tempel-logo-pdf-v2'; // NAIKKAN nomor ini (v3, v4, ...) SETIAP kali index.html diupdate,
                                          // supaya cache lama otomatis dibuang & versi baru langsung dipakai.
const ASSETS = ['./index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Untuk dokumen HTML (halaman utama): coba NETWORK dulu supaya selalu dapat
  // versi terbaru selama online. Kalau offline/gagal, baru jatuh ke cache.
  const isHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Untuk aset lain (ikon, manifest, dll): cache dulu biar cepat & hemat kuota,
  // network sebagai fallback.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)); return res; })
      .catch(() => cached))
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIF') {
    self.registration.showNotification(data.title, {
      body: data.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png',
      vibrate: [200, 100, 200], tag: data.tag || 'app-notif', renotify: true
    });
  }
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) if ('focus' in client) return client.focus();
    if (self.clients.openWindow) return self.clients.openWindow('./index.html');
  }));
});
