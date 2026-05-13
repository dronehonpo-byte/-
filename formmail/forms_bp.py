from email_validator import EmailNotValidError, validate_email
from flask import (
    Blueprint,
    abort,
    flash,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required

from .extensions import db
from .mailer import send_email
from .models import Form, Submission

bp = Blueprint("forms", __name__, url_prefix="/forms")
public_bp = Blueprint("public_forms", __name__)


# ---------- public submission endpoint ----------

def _wants_json() -> bool:
    accept = request.headers.get("Accept", "")
    if "application/json" in accept:
        return True
    if request.is_json:
        return True
    return request.headers.get("X-Requested-With") == "XMLHttpRequest"


def _cors_response(resp, status: int = 200):
    resp.status_code = status
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept"
    return resp


@public_bp.route("/f/<key>", methods=["POST", "OPTIONS"])
def submit(key: str):
    if request.method == "OPTIONS":
        return _cors_response(make_response(""), 204)

    form = Form.query.filter_by(key=key).first()
    if not form or not form.enabled:
        return _cors_response(jsonify({"error": "form_not_found"}), 404)

    if request.is_json:
        payload = request.get_json(silent=True) or {}
    else:
        payload = {k: v for k, v in request.form.items()}

    if not isinstance(payload, dict):
        return _cors_response(jsonify({"error": "invalid_payload"}), 400)

    honeypot_value = payload.pop(form.honeypot_field, None)
    is_spam = bool(honeypot_value)

    sender_email = None
    for k in ("email", "Email", "_replyto", "reply_to"):
        if payload.get(k):
            try:
                sender_email = validate_email(str(payload[k]), check_deliverability=False).normalized
                break
            except EmailNotValidError:
                pass

    sub = Submission(
        form_id=form.id,
        payload=payload,
        sender_email=sender_email,
        ip=request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip(),
        user_agent=request.headers.get("User-Agent", "")[:512],
        is_spam=is_spam,
    )
    db.session.add(sub)
    db.session.commit()

    if not is_spam:
        try:
            _forward_submission(form, sub)
        except Exception as exc:  # noqa: BLE001
            import logging

            logging.getLogger(__name__).exception("forward failed: %s", exc)

    if _wants_json():
        return _cors_response(jsonify({"ok": True, "id": sub.id}), 200)
    if form.redirect_url:
        return redirect(form.redirect_url)
    return _cors_response(make_response(render_template("thanks.html", form=form)), 200)


def _forward_submission(form: Form, sub: Submission) -> None:
    lines = [f"新しいフォーム送信を受信しました: {form.name}", ""]
    for k, v in sub.payload.items():
        lines.append(f"{k}: {v}")
    lines += ["", f"IP: {sub.ip or '-'}", f"User-Agent: {sub.user_agent or '-'}"]
    body = "\n".join(lines)
    reply_to = sub.sender_email if form.forward_replies and sub.sender_email else None
    send_email(
        subject=f"[Form] {form.name}",
        to=form.target_email,
        body_text=body,
        reply_to=reply_to,
    )


# ---------- authenticated management ----------


def _get_owned_form(form_id: int) -> Form:
    form = db.session.get(Form, form_id)
    if not form or form.owner_id != current_user.id:
        abort(404)
    return form


@bp.route("/")
@login_required
def index():
    forms = Form.query.filter_by(owner_id=current_user.id).order_by(Form.created_at.desc()).all()
    return render_template("forms_index.html", forms=forms)


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new():
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        target_email = (request.form.get("target_email") or "").strip()
        redirect_url = (request.form.get("redirect_url") or "").strip() or None
        if not name or not target_email:
            flash("名前と転送先メールは必須です", "error")
            return render_template("form_new.html"), 400
        try:
            target_email = validate_email(target_email, check_deliverability=False).normalized
        except EmailNotValidError:
            flash("転送先メールアドレスの形式が正しくありません", "error")
            return render_template("form_new.html"), 400
        form = Form(
            owner_id=current_user.id,
            name=name,
            target_email=target_email,
            redirect_url=redirect_url,
        )
        db.session.add(form)
        db.session.commit()
        return redirect(url_for("forms.detail", form_id=form.id))
    return render_template("form_new.html")


@bp.route("/<int:form_id>")
@login_required
def detail(form_id: int):
    form = _get_owned_form(form_id)
    return render_template("form_detail.html", form=form)


@bp.route("/<int:form_id>/toggle", methods=["POST"])
@login_required
def toggle(form_id: int):
    form = _get_owned_form(form_id)
    form.enabled = not form.enabled
    db.session.commit()
    return redirect(url_for("forms.detail", form_id=form.id))


@bp.route("/<int:form_id>/delete", methods=["POST"])
@login_required
def delete(form_id: int):
    form = _get_owned_form(form_id)
    db.session.delete(form)
    db.session.commit()
    return redirect(url_for("forms.index"))
