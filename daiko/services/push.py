"""スマホプッシュ通知（Web Push）.

- VAPID 鍵は環境変数（VAPID_PRIVATE_KEY_PEM）が無ければ STORAGE_DIR に自動生成・永続化。
- 送信は best-effort：失敗してもアプリの処理は止めない。無効になった購読(404/410)は削除。
- iOS は 16.4+ かつ「ホーム画面に追加」したPWAでのみ受信可（Safariの仕様）。Android/PC は通常のブラウザで可。
"""
from __future__ import annotations

import base64
import json
from pathlib import Path

from flask import current_app

from ..extensions import db
from ..models import PushSubscription

_VAPID_CACHE: dict = {}


def _vapid_paths() -> Path:
    storage = Path(current_app.config["STORAGE_DIR"])
    storage.mkdir(parents=True, exist_ok=True)
    return storage / "vapid_private.pem"


def _load_vapid():
    """(private_pem_path, public_key_b64url) を返す。無ければ生成して永続化."""
    if "pub" in _VAPID_CACHE:
        return _VAPID_CACHE["pem"], _VAPID_CACHE["pub"]

    from cryptography.hazmat.primitives import serialization
    from py_vapid import Vapid

    pem_path = _vapid_paths()
    if not pem_path.exists():
        v = Vapid()
        v.generate_keys()
        v.save_key(str(pem_path))
        current_app.logger.info("VAPID鍵を生成しました: %s", pem_path)
    v = Vapid.from_file(str(pem_path))
    raw = v.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    pub = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    _VAPID_CACHE["pem"] = str(pem_path)
    _VAPID_CACHE["pub"] = pub
    return _VAPID_CACHE["pem"], pub


def public_key() -> str:
    _, pub = _load_vapid()
    return pub


def save_subscription(role: str, recipient_id: int, sub: dict) -> bool:
    """購読を保存（同じ端末=endpointは上書き）."""
    endpoint = (sub or {}).get("endpoint")
    keys = (sub or {}).get("keys") or {}
    if not endpoint or "p256dh" not in keys or "auth" not in keys:
        return False
    row = PushSubscription.query.filter_by(endpoint=endpoint).first()
    if row is None:
        row = PushSubscription(endpoint=endpoint, role=role, recipient_id=recipient_id,
                               p256dh=keys["p256dh"], auth=keys["auth"])
        db.session.add(row)
    else:
        row.role, row.recipient_id = role, recipient_id
        row.p256dh, row.auth = keys["p256dh"], keys["auth"]
    db.session.commit()
    return True


def send(role: str, recipient_id: int, title: str, body: str = "", url: str = "/") -> None:
    """該当ユーザーの全端末へプッシュ送信（失敗しても例外は投げない）."""
    try:
        subs = PushSubscription.query.filter_by(role=role, recipient_id=recipient_id).all()
        if not subs:
            return
        from pywebpush import WebPushException, webpush

        pem, _ = _load_vapid()
        contact = current_app.config.get("CONTACT_EMAIL") or "admin@example.com"
        payload = json.dumps({"title": title, "body": body, "url": url})
        for s in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": s.endpoint,
                        "keys": {"p256dh": s.p256dh, "auth": s.auth},
                    },
                    data=payload,
                    vapid_private_key=pem,
                    vapid_claims={"sub": f"mailto:{contact}"},
                    timeout=6,
                )
            except WebPushException as exc:
                code = getattr(getattr(exc, "response", None), "status_code", None)
                if code in (400, 404, 410):
                    db.session.delete(s)  # 無効になった購読は掃除（外側のcommitで確定）
            except Exception:  # ネットワーク等の一時故障は握りつぶす
                pass
    except Exception:
        current_app.logger.exception("push send failed")
