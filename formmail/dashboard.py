from flask import Blueprint, render_template
from flask_login import current_user, login_required

from .models import Campaign, Form, Submission, Subscriber, SubscriberList
from .extensions import db

bp = Blueprint("dashboard", __name__)


@bp.route("/")
@login_required
def index():
    forms_count = Form.query.filter_by(owner_id=current_user.id).count()
    submissions_count = (
        db.session.query(Submission)
        .join(Form)
        .filter(Form.owner_id == current_user.id)
        .count()
    )
    lists_count = SubscriberList.query.filter_by(owner_id=current_user.id).count()
    subs_count = (
        db.session.query(Subscriber)
        .join(SubscriberList)
        .filter(SubscriberList.owner_id == current_user.id, Subscriber.status == "active")
        .count()
    )
    campaigns_count = Campaign.query.filter_by(owner_id=current_user.id).count()
    return render_template(
        "dashboard.html",
        forms_count=forms_count,
        submissions_count=submissions_count,
        lists_count=lists_count,
        subs_count=subs_count,
        campaigns_count=campaigns_count,
    )


@bp.route("/healthz")
def healthz():
    return {"status": "ok"}
