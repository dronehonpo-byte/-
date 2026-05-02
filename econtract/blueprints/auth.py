"""認証 (ログイン / 登録) ブループリント."""
from __future__ import annotations

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user

from ..extensions import db
from ..models import User

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        remember = bool(request.form.get("remember"))
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user, remember=remember)
            flash(f"{user.name} さん、ようこそ。", "success")
            next_url = request.args.get("next") or url_for("main.dashboard")
            return redirect(next_url)
        flash("メールアドレスまたはパスワードが正しくありません。", "danger")
    return render_template("auth/login.html")


@bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        name = (request.form.get("name") or "").strip()
        department = (request.form.get("department") or "").strip()
        password = request.form.get("password") or ""
        password2 = request.form.get("password2") or ""

        if not email or not name or len(password) < 6:
            flash("入力内容を確認してください（パスワードは6文字以上）。", "danger")
            return render_template("auth/register.html")
        if password != password2:
            flash("パスワードが一致しません。", "danger")
            return render_template("auth/register.html")
        if User.query.filter_by(email=email).first():
            flash("このメールアドレスは既に登録されています。", "warning")
            return render_template("auth/register.html")

        user = User(email=email, name=name, department=department)
        user.set_password(password)
        # 最初に登録したユーザーを管理者にする
        if User.query.count() == 0:
            user.is_admin = True
        db.session.add(user)
        db.session.commit()
        login_user(user)
        flash("アカウントを作成しました。", "success")
        return redirect(url_for("main.dashboard"))
    return render_template("auth/register.html")


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("ログアウトしました。", "info")
    return redirect(url_for("auth.login"))
