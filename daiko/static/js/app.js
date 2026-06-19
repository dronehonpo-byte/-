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
})();
