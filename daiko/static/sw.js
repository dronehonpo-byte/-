/* 代行の窓口 — Service Worker（PWA: オフラインで起動できる最小キャッシュ） */
const CACHE = 'daiko-v3';
const ASSETS = ['/', '/static/css/app.css', '/static/img/icon-192.png', '/static/img/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // API/POST はネットワーク優先（キャッシュしない）
  if (req.method !== 'GET' || req.url.includes('/api/') || req.url.includes('.json')) return;
  e.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/')))
  );
});

/* ── スマホプッシュ通知 ── */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'お知らせ', {
    body: d.body || '',
    icon: '/static/img/icon-192.png',
    badge: '/static/img/icon-192.png',
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
      for (const w of ws) {
        if ('focus' in w) { w.navigate(url); return w.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
