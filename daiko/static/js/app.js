/* 代行の窓口 — 共通スクリプト（PWA登録・通知ポーリング） */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  // 通知バッジのポーリング（ログイン中のみ）
  const badge = document.getElementById('notif-badge');
  if (badge) {
    const poll = () => {
      fetch('/api/notifications')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          if (d.unread > 0) {
            badge.textContent = d.unread;
            badge.style.display = '';
          } else {
            badge.style.display = 'none';
          }
        })
        .catch(() => {});
    };
    poll();
    setInterval(poll, 15000);
  }

  /* ── スマホプッシュ通知の購読 ── */
  const canPush = badge && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (canPush) setupPush();

  async function setupPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (Notification.permission === 'granted') {
        if (existing) await postSub(existing);   // ログインユーザーに紐付け直す
        else await subscribe(reg);
        return;
      }
      if (Notification.permission === 'denied') return;
      if (sessionStorage.getItem('pushBannerClosed')) return;
      showBanner(reg);
    } catch (_) {}
  }

  function showBanner(reg) {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:10px;right:10px;bottom:12px;z-index:2000;background:#fff;'
      + 'border:1.5px solid var(--green);border-radius:14px;box-shadow:0 10px 24px rgba(10,94,52,.18);'
      + 'padding:12px 14px;display:flex;align-items:center;gap:10px;font-size:13px';
    bar.innerHTML = '<span style="flex:1">依頼・確定などのお知らせを受け取れます。</span>'
      + '<button id="push-on" class="btn btn-green" style="padding:8px 14px;font-size:13px;white-space:nowrap">🔔 通知をオン</button>'
      + '<button id="push-close" style="background:none;border:none;font-size:16px;color:#5f7367">✕</button>';
    document.body.appendChild(bar);
    bar.querySelector('#push-close').onclick = () => { sessionStorage.setItem('pushBannerClosed', '1'); bar.remove(); };
    bar.querySelector('#push-on').onclick = async () => {
      try {
        const p = await Notification.requestPermission();
        if (p === 'granted') await subscribe(reg);
      } catch (_) {}
      bar.remove();
    };
  }

  async function subscribe(reg) {
    const r = await fetch('/api/push/public-key');
    const { key } = await r.json();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8(key),
    });
    await postSub(sub);
  }

  function postSub(sub) {
    return fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    }).catch(() => {});
  }

  function urlB64ToUint8(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }
})();
