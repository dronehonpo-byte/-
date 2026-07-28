"""管理者用システム — ダッシュボード・利用者/業者一覧・承認/停止・マッチング状況."""
from __future__ import annotations

import os
from datetime import datetime, timedelta

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)

from ..auth import admin_required, current_admin
from ..extensions import db
from ..models import (
    Customer,
    Driver,
    Entry,
    Request,
    RequestStatus,
    Vendor,
    VendorStatus,
)
from ..services.matching import purge_request  # ← モジュールimportは view 関数 matching() と衝突するため関数を直接import

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.route("/")
def dashboard():
    """管理アプリのトップ。未ログインは入口(ログイン)、ログイン済みは概況."""
    if current_admin() is None:
        return render_template("entry_admin.html", admin=None)
    since = datetime.utcnow() - timedelta(days=1)
    stats = {
        "today_requests": Request.query.filter(Request.created_at >= since).count(),
        "in_progress": Request.query.filter(
            Request.status.in_([RequestStatus.CONFIRMED, RequestStatus.IN_PROGRESS])
        ).count(),
        "open": Request.query.filter(
            Request.status.in_([RequestStatus.RECRUITING, RequestStatus.ENTERED])
        ).count(),
        "completed": Request.query.filter_by(status=RequestStatus.COMPLETED).count(),
        "customers": Customer.query.count(),
        "vendors": Vendor.query.count(),
        "pending_vendors": Vendor.query.filter_by(status=VendorStatus.PENDING).count(),
    }
    recent = Request.query.order_by(Request.created_at.desc()).limit(10).all()
    return render_template("admin/dashboard.html", stats=stats, recent=recent)


@bp.route("/request/<int:request_id>/delete", methods=["POST"])
@admin_required
def delete_request(request_id: int):
    """管理者によるリクエスト削除（テストデータ整理用・関連データごと削除）."""
    req = db.session.get(Request, request_id)
    if req is None:
        abort(404)
    try:
        purge_request(req)
        flash(f"リクエスト #{request_id} を削除しました。", "info")
    except Exception as exc:  # 500を出さず、原因を画面に表示
        db.session.rollback()
        current_app.logger.exception("admin delete_request failed")
        flash(f"削除に失敗しました：{type(exc).__name__}: {exc}", "danger")
    return redirect(request_referrer_or_dashboard())


def request_referrer_or_dashboard():
    from flask import request as _rq

    ref = _rq.referrer or ""
    if "/admin/matching" in ref:
        return url_for("admin.matching")
    return url_for("admin.dashboard")


@bp.route("/customers")
@admin_required
def customers():
    rows = Customer.query.order_by(Customer.created_at.desc()).all()
    return render_template("admin/customers.html", customers=rows)


@bp.route("/vendors")
@admin_required
def vendors():
    rows = Vendor.query.order_by(Vendor.created_at.desc()).all()
    return render_template("admin/vendors.html", vendors=rows)


@bp.route("/vendors/<int:vendor_id>/cert")
@admin_required
def vendor_cert(vendor_id: int):
    vendor = db.session.get(Vendor, vendor_id)
    if vendor is None or not vendor.cert_filename:
        abort(404)
    return send_from_directory(current_app.config["CERT_DIR"], vendor.cert_filename)


@bp.route("/vendors/<int:vendor_id>/approve", methods=["POST"])
@admin_required
def approve_vendor(vendor_id: int):
    _set_vendor_status(vendor_id, VendorStatus.APPROVED, "承認しました。")
    return redirect(url_for("admin.vendors"))


@bp.route("/vendors/<int:vendor_id>/suspend", methods=["POST"])
@admin_required
def suspend_vendor(vendor_id: int):
    _set_vendor_status(vendor_id, VendorStatus.SUSPENDED, "停止しました。")
    return redirect(url_for("admin.vendors"))


@bp.route("/vendors/<int:vendor_id>/delete", methods=["POST"])
@admin_required
def delete_vendor(vendor_id: int):
    """業者を所属ドライバー・提示ごと削除する."""
    from ..services import maintenance

    vendor = db.session.get(Vendor, vendor_id)
    if vendor is None:
        abort(404)
    name = vendor.name
    try:
        maintenance.purge_vendor(vendor_id)
        flash(f"業者「{name}」を削除しました。", "info")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("delete_vendor failed")
        flash(f"削除に失敗しました：{type(exc).__name__}", "danger")
    return redirect(url_for("admin.vendors"))


@bp.route("/reset", methods=["POST"])
@admin_required
def reset_data():
    """【危険】業者・利用者・依頼などの運用データを全消去（管理者は残す）."""
    from ..services import maintenance

    if request.form.get("confirm") != "リセット":
        flash("確認欄に「リセット」と入力してください。初期化は行いませんでした。", "warning")
        return redirect(url_for("admin.dashboard"))
    try:
        n = maintenance.wipe_operational_data()
        flash(f"運用データを初期化しました（利用者{n}件ほか全削除）。実運用を開始できます。", "info")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("reset_data failed")
        flash(f"初期化に失敗しました：{type(exc).__name__}", "danger")
    return redirect(url_for("admin.dashboard"))


@bp.route("/matching")
@admin_required
def matching():
    rows = Request.query.order_by(Request.created_at.desc()).limit(200).all()
    return render_template("admin/matching.html", reqs=rows)


def _set_vendor_status(vendor_id: int, status: VendorStatus, msg: str) -> None:
    vendor = db.session.get(Vendor, vendor_id)
    if vendor is None:
        abort(404)
    vendor.status = status
    db.session.commit()
    flash(f"{vendor.name}: {msg}", "success")
