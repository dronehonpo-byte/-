from email_validator import EmailNotValidError, validate_email
from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user

from .extensions import db
from .models import User

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        try:
            email = validate_email(email, check_deliverability=False).normalized
        except EmailNotValidError:
            flash("メールアドレスの形式が正しくありません", "error")
            return render_template("auth/register.html"), 400
        if len(password) < 8:
            flash("パスワードは8文字以上にしてください", "error")
            return render_template("auth/register.html"), 400
        if User.query.filter_by(email=email).first():
            flash("そのメールアドレスは既に登録されています", "error")
            return render_template("auth/register.html"), 400
        user = User(email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for("dashboard.index"))
    return render_template("auth/register.html")


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            flash("メールアドレスまたはパスワードが違います", "error")
            return render_template("auth/login.html"), 401
        login_user(user, remember=True)
        return redirect(request.args.get("next") or url_for("dashboard.index"))
    return render_template("auth/login.html")


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))
