"""共通ルート — ランディング、ロール選択、PWA、通知API."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, render_template, request

from ..auth import current_admin, current_customer, current_driver
from ..extensions import db
from ..models import Notification

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    """お客様専用トップ（入口を分離）."""
    return render_template("landing.html", customer=current_customer())


@bp.route("/driver")
def driver_entry():
    """ドライバー・業者専用の入口."""
    return render_template("entry_driver.html", driver=current_driver())


@bp.route("/staff")
def staff_entry():
    """管理者専用の入口."""
    return render_template("entry_admin.html", admin=current_admin())


@bp.route("/healthz")
def healthz():
    return {"status": "ok"}, 200


# ── PWA ──
@bp.route("/manifest.webmanifest")
def manifest():
    return current_app.send_static_file("manifest.webmanifest")


@bp.route("/sw.js")
def service_worker():
    resp = current_app.send_static_file("sw.js")
    resp.headers["Service-Worker-Allowed"] = "/"
    resp.headers["Cache-Control"] = "no-cache"
    return resp


# ── スマホプッシュ通知（Web Push） ──
@bp.route("/api/push/public-key")
def push_public_key():
    from ..services import push

    return jsonify({"key": push.public_key()})


@bp.route("/api/push/subscribe", methods=["POST"])
def push_subscribe():
    from ..services import push

    role, rid = _current_role_id()
    if role is None:
        return jsonify({"ok": False, "error": "login required"}), 401
    ok = push.save_subscription(role, rid, request.get_json(silent=True) or {})
    return jsonify({"ok": ok})


# ── アプリ内通知 API（ポーリング） ──
def _current_role_id():
    if (c := current_customer()) is not None:
        return "customer", c.id
    if (d := current_driver()) is not None:
        return "driver", d.id
    if (a := current_admin()) is not None:
        return "admin", a.id
    return None, None


@bp.route("/api/notifications")
def notifications():
    role, rid = _current_role_id()
    if role is None:
        return jsonify({"error": "unauthorized"}), 401
    items = (
        Notification.query.filter_by(role=role, recipient_id=rid)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    return jsonify(
        {
            "unread": sum(1 for n in items if not n.is_read),
            "items": [
                {
                    "id": n.id,
                    "title": n.title,
                    "body": n.body,
                    "request_id": n.request_id,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                }
                for n in items
            ],
        }
    )


@bp.route("/api/notifications/read", methods=["POST"])
def mark_read():
    role, rid = _current_role_id()
    if role is None:
        return jsonify({"error": "unauthorized"}), 401
    Notification.query.filter_by(role=role, recipient_id=rid, is_read=False).update(
        {Notification.is_read: True}
    )
    db.session.commit()
    return jsonify({"ok": True})
