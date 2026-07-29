"""お客様用アプリ — リクエスト送信・ドライバー選択・確定・ルート案内・履歴."""
from __future__ import annotations

from datetime import datetime

from flask import (
    Blueprint,
    current_app,
    flash,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)

from ..auth import current_customer, customer_required
from ..extensions import db
from ..models import Entry, EntryStatus, Request, RequestStatus
from ..services import matching
from ..services.matching import MatchingError

bp = Blueprint("customer", __name__, url_prefix="/c")


@bp.route("/")
def home():
    """お客様アプリのトップ。未ログインはランディング、ログイン済みはホーム."""
    customer = current_customer()
    if customer is None:
        return render_template("landing.html", customer=None)
    active = (
        customer.requests.filter(
            Request.status.notin_(
                [RequestStatus.COMPLETED, RequestStatus.CANCELLED, RequestStatus.EXPIRED]
            )
        )
        .order_by(Request.created_at.desc())
        .first()
    )
    if active is not None and matching.expire_if_stale(active):
        active = None  # 表示時に時間切れになったら募集案件なし扱い
    return render_template("customer/home.html", active=active)


@bp.route("/profile", methods=["GET", "POST"])
@customer_required
def profile():
    if request.method == "POST":
        g.customer.display_name = request.form.get("display_name", "").strip() or None
        db.session.commit()
        flash("プロフィールを保存しました。", "success")
        return redirect(url_for("customer.home"))
    return render_template("customer/profile.html")


@bp.route("/request/new", methods=["GET", "POST"])
@customer_required
def new_request():
    if request.method == "POST":
        try:
            data = {
                "origin_lat": request.form["origin_lat"],
                "origin_lng": request.form["origin_lng"],
                "origin_label": request.form.get("origin_label"),
                "dest_lat": request.form["dest_lat"],
                "dest_lng": request.form["dest_lng"],
                "dest_label": request.form.get("dest_label"),
                "car_type": (request.form.get("car_type") or "").strip() or None,
                "transmission": request.form.get("transmission", "AT"),
                "handle": request.form.get("handle", "right"),
                "via_count": request.form.get("via_count", 0),
                "asap": request.form.get("asap", "1") == "1",
                "note": request.form.get("note"),
            }
            sched = request.form.get("scheduled_time")
            if not data["asap"] and sched:
                data["scheduled_time"] = datetime.fromisoformat(sched)
            req = matching.create_request(g.customer.id, data)
        except (KeyError, ValueError):
            flash("出発地・目的地を地図で指定してください。", "danger")
            return render_template("customer/new_request.html")
        return redirect(url_for("customer.wait", request_id=req.id))
    return render_template("customer/new_request.html")


@bp.route("/request/<int:request_id>")
@customer_required
def wait(request_id: int):
    req = _own_request(request_id)
    if req.status in (RequestStatus.CONFIRMED, RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED):
        return redirect(url_for("customer.detail", request_id=req.id))
    return render_template("customer/wait.html", req=req)


@bp.route("/request/<int:request_id>/entries.json")
@customer_required
def entries_json(request_id: int):
    """エントリー待ち画面のポーリング用 JSON."""
    req = _own_request(request_id)
    matching.expire_if_stale(req)  # 10分経過なら自動で時間切れに
    entries = (
        req.entries.filter(Entry.status.in_([EntryStatus.OFFERED, EntryStatus.ACCEPTED]))
        .order_by(Entry.created_at.asc())  # エントリーした順（早い順）
        .all()
    )
    return jsonify(
        {
            "status": req.status.value,
            "status_label": req.status.label,
            "confirmed_entry_id": req.confirmed_entry_id,
            "elapsed_seconds": max(0, int((datetime.utcnow() - req.created_at).total_seconds())),
            "seconds_left": req.seconds_left,
            "ttl_seconds": req.RECRUIT_TTL_SECONDS,
            "entries": [
                {
                    "id": e.id,
                    "vendor_name": e.vendor.name,
                    "price": e.price,
                    "eta_minutes": e.eta_minutes,
                    "cancellation_fee": e.cancellation_fee,
                    "payment_methods": e.vendor.payment_method_list,
                    "status": e.status.value,
                }
                for e in entries
            ],
        }
    )


@bp.route("/request/<int:request_id>/confirm", methods=["POST"])
@customer_required
def confirm(request_id: int):
    entry_id = int(request.form["entry_id"])
    try:
        matching.confirm_entry(request_id, entry_id, g.customer.id)
        flash("ドライバーが確定しました。連絡先をご確認ください。", "success")
    except MatchingError as e:
        flash(str(e), "danger")
    return redirect(url_for("customer.detail", request_id=request_id))


@bp.route("/request/<int:request_id>/detail")
@customer_required
def detail(request_id: int):
    req = _own_request(request_id)
    return render_template("customer/detail.html", req=req)


@bp.route("/request/<int:request_id>/cancel", methods=["POST"])
@customer_required
def cancel(request_id: int):
    try:
        matching.cancel(request_id, by_role="customer", actor_id=g.customer.id)
        flash("リクエストをキャンセルしました。", "info")
    except MatchingError as e:
        flash(str(e), "danger")
    return redirect(url_for("customer.home"))


@bp.route("/history")
@customer_required
def history():
    reqs = g.customer.requests.order_by(Request.created_at.desc()).all()
    return render_template("customer/history.html", reqs=reqs)


@bp.route("/request/<int:request_id>/delete", methods=["POST"])
@customer_required
def delete_request(request_id: int):
    """依頼履歴から1件削除（進行中は不可）."""
    req = _own_request(request_id)
    if req.status.is_active:
        flash("進行中の依頼は削除できません。先にキャンセルしてください。", "danger")
        return redirect(url_for("customer.history"))
    try:
        matching.purge_request(req)
        flash("履歴を削除しました。", "info")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("customer delete_request failed")
        flash(f"削除に失敗しました：{type(exc).__name__}", "danger")
    return redirect(url_for("customer.history"))


def _own_request(request_id: int) -> Request:
    req = db.session.get(Request, request_id)
    if req is None or req.customer_id != g.customer.id:
        from flask import abort

        abort(404)
    return req
