"""共通ルート — ランディング、ロール選択、PWA、通知API."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, redirect, render_template, request, url_for

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
    """ドライバー入口（旧URL）→ ドライバーアプリ領域 /d/ へ."""
    return redirect(url_for("driver.dashboard"))


@bp.route("/staff")
def staff_entry():
    """管理者入口（旧URL）→ 管理アプリ領域 /admin/ へ."""
    return redirect(url_for("admin.dashboard"))


# 旧・認証URLの互換リダイレクト（既存のブックマーク／ホーム画面アイコン対策）
@bp.route("/auth/driver/login")
def _legacy_driver_login():
    return redirect(url_for("auth.driver_login"))


@bp.route("/auth/vendor/register")
def _legacy_vendor_register():
    return redirect(url_for("auth.vendor_register"))


@bp.route("/auth/admin/login")
def _legacy_admin_login():
    return redirect(url_for("auth.admin_login"))


@bp.route("/healthz")
def healthz():
    return {"status": "ok"}, 200


# ── PWA ──
@bp.route("/manifest.webmanifest")  # 後方互換（?app=）
@bp.route("/manifest.<app_kind>.webmanifest")  # 役割ごとに別URL（Androidで別アプリ認識されやすい）
def manifest(app_kind: str | None = None):
    """役割ごとに start_url / 名前 / アイコン / URL を変えた PWA マニフェストを返す.

    お客様/ドライバー/管理者を「別アプリ」としてホーム画面に追加でき、アイコンから
    開くと各アプリのトップが起動する。Android では manifest の URL・id・scope・
    アイコンをすべて別にすることで、別アプリとして個別インストールされやすくなる。
    """
    # (表示名, start_url, scope, アイコンの接頭辞)
    # scope を役割ごとに分けることで Android でも「別アプリ」として個別インストールできる。
    apps = {
        "customer": ("お客様の窓口", "/", "/", "icon"),
        "driver": ("ドライバーの窓口", "/d/", "/d/", "icon-driver"),
        "admin": ("管理者の窓口", "/admin/", "/admin/", "icon-admin"),
    }
    kind = app_kind or request.args.get("app", "customer")
    name, start, scope, ic = apps.get(kind, apps["customer"])
    data = {
        "id": start,
        "name": name,
        "short_name": name,
        "description": "運転代行マッチング — 宇都宮市の運転代行をスマホで",
        "start_url": start,
        "scope": scope,
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#00c46a",
        "icons": [
            {"src": f"/static/img/{ic}-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": f"/static/img/{ic}-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": f"/static/img/{ic}-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": f"/static/img/{ic}-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    resp = jsonify(data)
    resp.headers["Content-Type"] = "application/manifest+json"
    resp.headers["Cache-Control"] = "no-cache"
    return resp


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
