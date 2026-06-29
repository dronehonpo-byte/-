/* 代行の窓口 — Service Worker（PWA: オフラインで起動できる最小キャッシュ） */
const CACHE = 'daiko-v2';
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
