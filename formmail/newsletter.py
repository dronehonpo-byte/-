import csv
import io
from datetime import datetime

from email_validator import EmailNotValidError, validate_email
from flask import (
    Blueprint,
    abort,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required

from .extensions import db
from .mailer import send_bulk, send_email
from .models import Campaign, Subscriber, SubscriberList
from .security import (
    make_confirm_token,
    make_unsubscribe_token,
    parse_confirm_token,
    parse_unsubscribe_token,
)

bp = Blueprint("newsletter", __name__, url_prefix="/newsletter")
public_bp = Blueprint("public_newsletter", __name__)


def _get_owned_list(list_id: int) -> SubscriberList:
    sl = db.session.get(SubscriberList, list_id)
    if not sl or sl.owner_id != current_user.id:
        abort(404)
    return sl


def _get_owned_campaign(campaign_id: int) -> Campaign:
    c = db.session.get(Campaign, campaign_id)
    if not c or c.owner_id != current_user.id:
        abort(404)
    return c


# ---------- list management ----------


@bp.route("/")
@login_required
def index():
    lists = (
        SubscriberList.query.filter_by(owner_id=current_user.id)
        .order_by(SubscriberList.created_at.desc())
        .all()
    )
    return render_template("newsletter/lists.html", lists=lists)


@bp.route("/lists/new", methods=["GET", "POST"])
@login_required
def list_new():
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        from_name = (request.form.get("from_name") or "").strip() or None
        from_email = (request.form.get("from_email") or "").strip() or None
        confirm_required = bool(request.form.get("confirm_required"))
        if not name:
            flash("名前は必須です", "error")
            return render_template("newsletter/list_new.html"), 400
        if from_email:
            try:
                from_email = validate_email(from_email, check_deliverability=False).normalized
            except EmailNotValidError:
                flash("送信元メールの形式が正しくありません", "error")
                return render_template("newsletter/list_new.html"), 400
        sl = SubscriberList(
            owner_id=current_user.id,
            name=name,
            from_name=from_name,
            from_email=from_email,
            confirm_required=confirm_required,
        )
        db.session.add(sl)
        db.session.commit()
        return redirect(url_for("newsletter.list_detail", list_id=sl.id))
    return render_template("newsletter/list_new.html")


@bp.route("/lists/<int:list_id>")
@login_required
def list_detail(list_id: int):
    sl = _get_owned_list(list_id)
    return render_template("newsletter/list_detail.html", sl=sl)


@bp.route("/lists/<int:list_id>/delete", methods=["POST"])
@login_required
def list_delete(list_id: int):
    sl = _get_owned_list(list_id)
    db.session.delete(sl)
    db.session.commit()
    return redirect(url_for("newsletter.index"))


# ---------- subscriber management ----------


@bp.route("/lists/<int:list_id>/subscribers/add", methods=["POST"])
@login_required
def subscriber_add(list_id: int):
    sl = _get_owned_list(list_id)
    email = (request.form.get("email") or "").strip().lower()
    name = (request.form.get("name") or "").strip() or None
    try:
        email = validate_email(email, check_deliverability=False).normalized
    except EmailNotValidError:
        flash("メールアドレスの形式が正しくありません", "error")
        return redirect(url_for("newsletter.list_detail", list_id=list_id))
    existing = Subscriber.query.filter_by(list_id=sl.id, email=email).first()
    if existing:
        flash("既に登録されています", "error")
        return redirect(url_for("newsletter.list_detail", list_id=list_id))
    sub = Subscriber(list_id=sl.id, email=email, name=name, status="active",
                     confirmed_at=datetime.utcnow())
    db.session.add(sub)
    db.session.commit()
    flash("追加しました", "success")
    return redirect(url_for("newsletter.list_detail", list_id=list_id))


@bp.route("/lists/<int:list_id>/subscribers/import", methods=["POST"])
@login_required
def subscriber_import(list_id: int):
    sl = _get_owned_list(list_id)
    file = request.files.get("csv")
    if not file:
        flash("CSVファイルが指定されていません", "error")
        return redirect(url_for("newsletter.list_detail", list_id=list_id))
    text = file.read().decode("utf-8-sig", errors="replace")
    reader = csv.reader(io.StringIO(text))
    added = skipped = 0
    for row in reader:
        if not row:
            continue
        email_raw = row[0].strip()
        if not email_raw or "@" not in email_raw:
            continue
        try:
            email = validate_email(email_raw, check_deliverability=False).normalized
        except EmailNotValidError:
            skipped += 1
            continue
        if Subscriber.query.filter_by(list_id=sl.id, email=email).first():
            skipped += 1
            continue
        name = row[1].strip() if len(row) > 1 else None
        db.session.add(Subscriber(
            list_id=sl.id, email=email, name=name, status="active",
            confirmed_at=datetime.utcnow(),
        ))
        added += 1
    db.session.commit()
    flash(f"{added} 件追加、{skipped} 件スキップ", "success")
    return redirect(url_for("newsletter.list_detail", list_id=list_id))


@bp.route("/lists/<int:list_id>/subscribers/<int:sub_id>/delete", methods=["POST"])
@login_required
def subscriber_delete(list_id: int, sub_id: int):
    sl = _get_owned_list(list_id)
    sub = db.session.get(Subscriber, sub_id)
    if not sub or sub.list_id != sl.id:
        abort(404)
    db.session.delete(sub)
    db.session.commit()
    return redirect(url_for("newsletter.list_detail", list_id=list_id))


# ---------- campaigns ----------


@bp.route("/campaigns")
@login_required
def campaigns():
    items = (
        Campaign.query.filter_by(owner_id=current_user.id)
        .order_by(Campaign.created_at.desc())
        .all()
    )
    return render_template("newsletter/campaigns.html", campaigns=items)


@bp.route("/campaigns/new", methods=["GET", "POST"])
@login_required
def campaign_new():
    lists = (
        SubscriberList.query.filter_by(owner_id=current_user.id)
        .order_by(SubscriberList.name)
        .all()
    )
    if request.method == "POST":
        list_id = int(request.form.get("list_id") or 0)
        subject = (request.form.get("subject") or "").strip()
        body_html = (request.form.get("body_html") or "").strip() or None
        body_text = (request.form.get("body_text") or "").strip() or None
        sl = _get_owned_list(list_id)
        if not subject or (not body_html and not body_text):
            flash("件名と本文(HTMLまたはテキスト)が必要です", "error")
            return render_template("newsletter/campaign_new.html", lists=lists), 400
        c = Campaign(
            owner_id=current_user.id,
            list_id=sl.id,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
        )
        db.session.add(c)
        db.session.commit()
        return redirect(url_for("newsletter.campaign_detail", campaign_id=c.id))
    return render_template("newsletter/campaign_new.html", lists=lists)


@bp.route("/campaigns/<int:campaign_id>")
@login_required
def campaign_detail(campaign_id: int):
    c = _get_owned_campaign(campaign_id)
    active_count = Subscriber.query.filter_by(list_id=c.list_id, status="active").count()
    return render_template(
        "newsletter/campaign_detail.html", campaign=c, active_count=active_count
    )


@bp.route("/campaigns/<int:campaign_id>/send", methods=["POST"])
@login_required
def campaign_send(campaign_id: int):
    c = _get_owned_campaign(campaign_id)
    if c.status == "sent":
        flash("既に送信済みです", "error")
        return redirect(url_for("newsletter.campaign_detail", campaign_id=c.id))
    c.status = "sending"
    db.session.commit()

    subs = Subscriber.query.filter_by(list_id=c.list_id, status="active").all()
    sl = c.list

    messages = []
    for s in subs:
        unsub_url = (
            request.url_root.rstrip("/")
            + url_for(
                "public_newsletter.unsubscribe",
                token=make_unsubscribe_token(sl.id, s.id),
            )
        )
        footer_text = f"\n\n---\n配信停止: {unsub_url}\n"
        footer_html = (
            f'<hr><p style="font-size:12px;color:#666">'
            f'このメルマガを配信停止するには '
            f'<a href="{unsub_url}">こちら</a>'
            f"</p>"
        )
        body_text = (c.body_text or "") + footer_text
        body_html = (c.body_html + footer_html) if c.body_html else None
        messages.append(
            dict(
                subject=c.subject,
                to=s.email,
                body_text=body_text,
                body_html=body_html,
                from_email=sl.from_email,
                from_name=sl.from_name,
                headers={"List-Unsubscribe": f"<{unsub_url}>"},
            )
        )

    sent, failed = send_bulk(messages)
    c.sent_count = sent
    c.failed_count = failed
    c.status = "sent" if failed == 0 else "failed"
    c.sent_at = datetime.utcnow()
    db.session.commit()
    flash(f"送信: {sent} 件 / 失敗: {failed} 件", "success")
    return redirect(url_for("newsletter.campaign_detail", campaign_id=c.id))


@bp.route("/campaigns/<int:campaign_id>/delete", methods=["POST"])
@login_required
def campaign_delete(campaign_id: int):
    c = _get_owned_campaign(campaign_id)
    db.session.delete(c)
    db.session.commit()
    return redirect(url_for("newsletter.campaigns"))


# ---------- public subscribe / confirm / unsubscribe ----------


@public_bp.route("/subscribe/<public_key>", methods=["GET", "POST"])
def subscribe(public_key: str):
    sl = SubscriberList.query.filter_by(public_key=public_key).first()
    if not sl:
        abort(404)
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        name = (request.form.get("name") or "").strip() or None
        try:
            email = validate_email(email, check_deliverability=False).normalized
        except EmailNotValidError:
            return render_template("newsletter/subscribe.html", sl=sl, error="メールアドレスが正しくありません"), 400
        existing = Subscriber.query.filter_by(list_id=sl.id, email=email).first()
        if existing and existing.status == "active":
            return render_template("newsletter/subscribed.html", sl=sl, already=True)
        if existing:
            existing.status = "pending" if sl.confirm_required else "active"
            existing.unsubscribed_at = None
            sub = existing
        else:
            sub = Subscriber(
                list_id=sl.id,
                email=email,
                name=name,
                status="pending" if sl.confirm_required else "active",
            )
            db.session.add(sub)
        if not sl.confirm_required:
            sub.confirmed_at = datetime.utcnow()
        db.session.commit()

        if sl.confirm_required:
            token = make_confirm_token(sub.id)
            confirm_url = request.url_root.rstrip("/") + url_for(
                "public_newsletter.confirm", token=token
            )
            try:
                send_email(
                    subject=f"[{sl.name}] 登録確認",
                    to=sub.email,
                    body_text=f"以下のURLをクリックして登録を確定してください:\n{confirm_url}\n",
                    body_html=f'<p>以下のリンクをクリックして登録を確定してください:</p><p><a href="{confirm_url}">{confirm_url}</a></p>',
                    from_email=sl.from_email,
                    from_name=sl.from_name,
                )
            except Exception:
                import logging
                logging.getLogger(__name__).exception("confirm email failed")
        return render_template("newsletter/subscribed.html", sl=sl, already=False)
    return render_template("newsletter/subscribe.html", sl=sl)


@public_bp.route("/n/confirm/<token>")
def confirm(token: str):
    sub_id = parse_confirm_token(token)
    if not sub_id:
        abort(404)
    sub = db.session.get(Subscriber, sub_id)
    if not sub:
        abort(404)
    sub.status = "active"
    sub.confirmed_at = datetime.utcnow()
    db.session.commit()
    return render_template("newsletter/confirmed.html", sub=sub)


@public_bp.route("/n/unsubscribe/<token>", methods=["GET", "POST"])
def unsubscribe(token: str):
    parsed = parse_unsubscribe_token(token)
    if not parsed:
        abort(404)
    list_id, sub_id = parsed
    sub = db.session.get(Subscriber, sub_id)
    if not sub or sub.list_id != list_id:
        abort(404)
    if sub.status != "unsubscribed":
        sub.status = "unsubscribed"
        sub.unsubscribed_at = datetime.utcnow()
        db.session.commit()
    return render_template("newsletter/unsubscribed.html", sub=sub)
