// sw.js — Tempel Logo PDF (update otomatis)
const CACHE_PREFIX = 'tempel-logo-pdf-';
const CACHE_NAME = CACHE_PREFIX + 'v4'; // naikkan (v5, v6, ...) HANYA bila menambah/mengganti file di ASSETS
const ASSETS = ['./index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Hanya hapus cache lama milik aplikasi ini. Cache 'shared-pdf' (PDF dari menu Bagikan) tidak ikut terhapus.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME)
        .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // PDF yang dikirim lewat menu "Bagikan" Android (share_target):
  // simpan sementara ke cache, lalu arahkan ke halaman utama yang akan membukanya di pembaca.
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const file = form.get('pdf');
        if (file && file.size) {
          const cache = await caches.open('shared-pdf');
          await cache.put('shared-file', new Response(file, {
            headers: { 'Content-Type': 'application/pdf', 'X-Name': encodeURIComponent(file.name || 'dokumen.pdf') }
          }));
        }
      } catch (e) {}
      return Response.redirect('./index.html?shared=1', 303);
    })());
    return;
  }

  if (event.request.method !== 'GET') return;

  // Internet dulu supaya update otomatis terambil; bila offline pakai cache.
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((m) => m || caches.match('./index.html')))
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
