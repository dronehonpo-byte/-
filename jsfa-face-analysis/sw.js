/* JSFA 顔解析アプリ Service Worker
   目的：初回読み込み後はオフライン（Wi-Fiなし）でも動作させる。
   方針：アプリ本体＝プリキャッシュ、MediaPipe(CDN/モデル)＝実行時にキャッシュ。*/
const CACHE = "jsfa-face-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
];
// 実行時キャッシュ対象（MediaPipe の CDN / wasm / モデル）
const RUNTIME_HOSTS = [
  "cdn.jsdelivr.net",
  "storage.googleapis.com",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isShell = url.origin === self.location.origin;
  const isRuntime = RUNTIME_HOSTS.includes(url.hostname);
  if (!isShell && !isRuntime) return;

  // cache-first（オフライン耐性優先）→ 無ければネットワーク→取得後にキャッシュ
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
