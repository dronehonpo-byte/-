/* 代行の窓口 — 共通スクリプト（PWA登録・通知ポーリング） */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  // 通知バッジのポーリング＋ベルのパネル（ログイン中のみ）
  const badge = document.getElementById('notif-badge');
  const bell = document.getElementById('notif-link');
  const panel = document.getElementById('notif-panel');
  const list = document.getElementById('notif-list');
  let lastItems = [];
  if (badge) {
    const setBadge = (n) => {
      if (n > 0) { badge.textContent = n; badge.style.display = ''; }
      else { badge.style.display = 'none'; }
    };
    const poll = () => {
      fetch('/api/notifications')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!d) return; lastItems = d.items || []; setBadge(d.unread || 0); })
        .catch(() => {});
    };
    poll();
    setInterval(poll, 15000);

    // ベルを押すとお知らせ一覧を表示し、未読を既読化（数字が消える）
    if (bell && panel && list) {
      const timeAgo = (iso) => {
        const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60) return 'たった今';
        if (s < 3600) return Math.floor(s / 60) + '分前';
        if (s < 86400) return Math.floor(s / 3600) + '時間前';
        return Math.floor(s / 86400) + '日前';
      };
      const rolePrefix = document.body.getAttribute('data-role-prefix') || '';
      bell.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const open = panel.style.display !== 'none';
        if (open) { panel.style.display = 'none'; return; }
        list.innerHTML = lastItems.length
          ? lastItems.map((n) => {
              const cls = n.is_read ? 'notif-item' : 'notif-item unread';
              const inner = `<div class="notif-t">${n.title || ''}</div>`
                + (n.body ? `<div class="notif-b">${n.body}</div>` : '')
                + `<div class="notif-time">${timeAgo(n.created_at)}</div>`;
              return (n.request_id && rolePrefix)
                ? `<a class="${cls}" href="${rolePrefix}request/${n.request_id}">${inner}</a>`
                : `<div class="${cls}">${inner}</div>`;
            }).join('')
          : '<div class="notif-empty">お知らせはありません</div>';
        panel.style.display = 'block';
        // 既読化
        fetch('/api/notifications/read', { method: 'POST' }).then(() => setBadge(0)).catch(() => {});
      });
      document.addEventListener('click', (e) => {
        if (panel.style.display !== 'none' && !panel.contains(e.target) && e.target !== bell) {
          panel.style.display = 'none';
        }
      });
    }
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
