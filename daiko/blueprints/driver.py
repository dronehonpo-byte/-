"""ドライバー/業者用アプリ — 近くのリクエスト・エントリー・確定案件・履歴."""
from __future__ import annotations

from flask import Blueprint, flash, g, jsonify, redirect, render_template, request, url_for

from ..auth import driver_required
from ..extensions import db
from ..models import Entry, EntryStatus, Request, RequestStatus
from ..services import matching
from ..services.geo import haversine_km
from ..services.matching import MatchingError

bp = Blueprint("driver", __name__, url_prefix="/d")


@bp.route("/")
@driver_required
def dashboard():
    return render_template("driver/dashboard.html", driver=g.driver)


@bp.route("/requests.json")
@driver_required
def requests_json():
    """近くの募集中リクエスト一覧（地図・一覧の両方で使用）."""
    open_reqs = (
        Request.query.filter(
            Request.status.in_([RequestStatus.RECRUITING, RequestStatus.ENTERED])
        )
        .order_by(Request.created_at.desc())
        .limit(100)
        .all()
    )
    my_entries = {
        e.request_id: e.status.value
        for e in Entry.query.filter_by(driver_id=g.driver.id).all()
    }
    items = []
    for r in open_reqs:
        items.append(
            {
                "id": r.id,
                "origin_lat": r.origin_lat,
                "origin_lng": r.origin_lng,
                "origin_label": r.origin_label,
                "dest_label": r.dest_label,
                "car_type": r.car_type,
                "transmission": r.transmission.value,
                "handle": r.handle.label,
                "via_count": r.via_count,
                "time_label": r.time_label,
                "entry_count": r.entries.filter(
                    Entry.status.in_([EntryStatus.OFFERED, EntryStatus.ACCEPTED])
                ).count(),
                "my_entry": my_entries.get(r.id),
            }
        )
    return jsonify({"items": items})


@bp.route("/request/<int:request_id>")
@driver_required
def request_detail(request_id: int):
    req = db.session.get(Request, request_id)
    if req is None:
        from flask import abort

        abort(404)
    my_entry = Entry.query.filter_by(request_id=request_id, driver_id=g.driver.id).first()
    return render_template("driver/request_detail.html", req=req, my_entry=my_entry)


@bp.route("/request/<int:request_id>/entry", methods=["POST"])
@driver_required
def entry(request_id: int):
    if not g.driver.can_operate:
        flash("業者の承認が完了するとエントリーできます。", "warning")
        return redirect(url_for("driver.request_detail", request_id=request_id))
    try:
        matching.add_entry(
            request_id,
            g.driver,
            price=int(request.form["price"]),
            eta_minutes=int(request.form["eta_minutes"]),
            cancellation_fee=request.form.get("cancellation_fee") or None,
        )
        flash("エントリーしました。お客様の選択をお待ちください。", "success")
    except (MatchingError, ValueError) as e:
        flash(str(e) if isinstance(e, MatchingError) else "料金・到着時間を正しく入力してください。", "danger")
    return redirect(url_for("driver.request_detail", request_id=request_id))


@bp.route("/jobs")
@driver_required
def jobs():
    """確定案件（自分が成立したもの）."""
    accepted = (
        Entry.query.filter_by(driver_id=g.driver.id, status=EntryStatus.ACCEPTED)
        .join(Request, Entry.request_id == Request.id)
        .filter(Request.status.in_([RequestStatus.CONFIRMED, RequestStatus.IN_PROGRESS]))
        .all()
    )
    return render_template("driver/jobs.html", entries=accepted)


@bp.route("/request/<int:request_id>/start", methods=["POST"])
@driver_required
def start(request_id: int):
    try:
        matching.start_progress(request_id, g.driver.id)
        flash("対応を開始しました。", "success")
    except MatchingError as e:
        flash(str(e), "danger")
    return redirect(url_for("driver.request_detail", request_id=request_id))


@bp.route("/request/<int:request_id>/complete", methods=["POST"])
@driver_required
def complete(request_id: int):
    try:
        matching.complete(request_id, g.driver.id)
        flash("対応を完了しました。料金は現地で精算してください。", "success")
    except MatchingError as e:
        flash(str(e), "danger")
    return redirect(url_for("driver.history"))


@bp.route("/history")
@driver_required
def history():
    entries = (
        Entry.query.filter_by(driver_id=g.driver.id)
        .order_by(Entry.created_at.desc())
        .all()
    )
    return render_template("driver/history.html", entries=entries)
