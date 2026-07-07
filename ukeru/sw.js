/* JSFA 顔解析アプリ Service Worker
   目的：初回読み込み後はオフライン（Wi-Fiなし）でも動作させる。
   方針：
     - HTML/アプリ資産（同一オリジン）＝ネットワーク優先。更新を必ず反映し、
       オフライン時のみキャッシュにフォールバック。
     - MediaPipe（CDN/wasm/モデル）＝キャッシュ優先。バージョン付きURLで安全＆高速。*/
const CACHE = "jsfa-face-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
];
const RUNTIME_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isShell = url.origin === self.location.origin;
  const isRuntime = RUNTIME_HOSTS.includes(url.hostname);
  if (!isShell && !isRuntime) return;

  if (isShell) {
    // ネットワーク優先：常に最新を取得。取得できたらキャッシュ更新。オフライン時のみキャッシュ。
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // MediaPipe CDN / モデル / wasm：キャッシュ優先（オフライン耐性＆高速）
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit)
    )
  );
});
