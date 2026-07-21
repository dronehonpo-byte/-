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
    send_from_directory,
    url_for,
)

from ..auth import admin_required
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
from ..services import matching

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.route("/")
@admin_required
def dashboard():
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
    matching.purge_request(req)
    flash(f"リクエスト #{request_id} を削除しました。", "info")
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
