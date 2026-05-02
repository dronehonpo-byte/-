"""ダッシュボードと監査ログ画面."""
from __future__ import annotations

from collections import Counter

from flask import Blueprint, render_template
from flask_login import current_user, login_required
from sqlalchemy import func

from ..extensions import db
from ..models import AuditLog, Contract, ContractStatus, Signer, User

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    if current_user.is_authenticated:
        from flask import redirect, url_for
        return redirect(url_for("main.dashboard"))
    return render_template("landing.html")


@bp.route("/dashboard")
@login_required
def dashboard():
    if current_user.is_admin:
        contracts_q = Contract.query
    else:
        contracts_q = Contract.query.filter(Contract.creator_id == current_user.id)

    total = contracts_q.count()
    by_status = Counter(c.status for c in contracts_q.all())
    recent = contracts_q.order_by(Contract.updated_at.desc()).limit(10).all()
    pending_signers = (
        Signer.query.join(Contract)
        .filter(Signer.status == "pending")
        .filter(Contract.status.in_(["sent", "partial"]))
        .filter((Contract.creator_id == current_user.id) | (db.literal(current_user.is_admin)))
        .order_by(Signer.id.desc())
        .limit(8)
        .all()
    )

    return render_template(
        "dashboard.html",
        total=total,
        by_status=by_status,
        recent=recent,
        pending_signers=pending_signers,
        ContractStatus=ContractStatus,
    )


@bp.route("/audit")
@login_required
def audit():
    if current_user.is_admin:
        logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(200).all()
    else:
        logs = (
            AuditLog.query.join(Contract)
            .filter(Contract.creator_id == current_user.id)
            .order_by(AuditLog.created_at.desc())
            .limit(200)
            .all()
        )
    return render_template("audit.html", logs=logs)
