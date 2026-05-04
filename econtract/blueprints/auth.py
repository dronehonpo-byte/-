"""認証 (ローカル + Google OAuth) ブループリント."""
from __future__ import annotations

from datetime import datetime

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user

from ..extensions import db, oauth
from ..models import User

bp = Blueprint("auth", __name__, url_prefix="/auth")


# ---------- ローカル (email + password) ----------

@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))

    if request.method == "POST":
        if not current_app.config.get("ALLOW_PASSWORD_LOGIN", True):
            flash("パスワードログインは無効化されています。Googleでログインしてください。", "warning")
            return redirect(url_for("auth.login"))
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        remember = bool(request.form.get("remember"))
        user = User.query.filter_by(email=email).first()
        if user and user.is_active and user.check_password(password):
            user.last_login_at = datetime.utcnow()
            db.session.commit()
            login_user(user, remember=remember)
            flash(f"{user.name} さん、ようこそ。", "success")
            next_url = _safe_next(request.args.get("next"))
            return redirect(next_url or url_for("main.dashboard"))
        flash("メールアドレスまたはパスワードが正しくありません。", "danger")
    return render_template("auth/login.html")


@bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))
    if current_app.config.get("DISABLE_REGISTRATION", False):
        flash("ブラウザからのアカウント作成は無効化されています。管理者にご連絡ください。", "info")
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        name = (request.form.get("name") or "").strip()
        department = (request.form.get("department") or "").strip()
        password = request.form.get("password") or ""
        password2 = request.form.get("password2") or ""

        if not email or not name or len(password) < 8:
            flash("入力内容を確認してください（パスワードは8文字以上）。", "danger")
            return render_template("auth/register.html")
        if password != password2:
            flash("パスワードが一致しません。", "danger")
            return render_template("auth/register.html")
        if User.query.filter_by(email=email).first():
            flash("このメールアドレスは既に登録されています。", "warning")
            return render_template("auth/register.html")

        user = User(email=email, name=name, department=department)
        user.set_password(password)
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


# ---------- Google OAuth ----------

@bp.route("/google")
def google_login():
    if not _oauth_enabled():
        flash("Google OAuth は設定されていません。", "warning")
        return redirect(url_for("auth.login"))
    google = oauth.create_client("google")
    redirect_uri = url_for("auth.google_callback", _external=True)
    # next を session に保持
    nxt = _safe_next(request.args.get("next"))
    if nxt:
        session["oauth_next"] = nxt
    return google.authorize_redirect(redirect_uri)


@bp.route("/google/callback")
def google_callback():
    if not _oauth_enabled():
        flash("Google OAuth は設定されていません。", "warning")
        return redirect(url_for("auth.login"))
    google = oauth.create_client("google")
    try:
        token = google.authorize_access_token()
    except Exception as e:  # noqa: BLE001
        current_app.logger.warning("Google OAuth exchange failed: %s", e)
        flash("Google ログインに失敗しました。", "danger")
        return redirect(url_for("auth.login"))

    userinfo = token.get("userinfo")
    if not userinfo:
        try:
            userinfo = google.userinfo(token=token)
        except Exception as e:  # noqa: BLE001
            current_app.logger.warning("userinfo failed: %s", e)
            flash("ユーザー情報の取得に失敗しました。", "danger")
            return redirect(url_for("auth.login"))

    sub = userinfo.get("sub")
    email = (userinfo.get("email") or "").lower()
    name = userinfo.get("name") or email.split("@")[0]
    avatar = userinfo.get("picture")
    hd = userinfo.get("hd") or (email.split("@", 1)[1] if "@" in email else "")
    email_verified = userinfo.get("email_verified", False)

    if not email or not sub:
        flash("メールアドレスを取得できませんでした。", "danger")
        return redirect(url_for("auth.login"))
    if not email_verified:
        flash("メールが Google で確認されていません。", "danger")
        return redirect(url_for("auth.login"))

    allowed = current_app.config.get("GOOGLE_HOSTED_DOMAIN", "")
    if allowed:
        domain = email.rsplit("@", 1)[-1]
        if hd != allowed and domain != allowed:
            flash(f"許可されたドメイン ({allowed}) のアカウントでログインしてください。", "danger")
            return redirect(url_for("auth.login"))

    # 既存ユーザー検索: sub → email の順
    user = User.query.filter_by(google_sub=sub).first()
    if not user:
        user = User.query.filter_by(email=email).first()

    if user:
        if not user.is_active:
            flash("このアカウントは無効化されています。", "danger")
            return redirect(url_for("auth.login"))
        # 同期
        user.google_sub = sub
        user.avatar_url = avatar or user.avatar_url
        user.name = user.name or name
    else:
        # 新規
        user = User(
            email=email,
            name=name,
            google_sub=sub,
            avatar_url=avatar,
            is_admin=(User.query.count() == 0),  # 最初のユーザーを管理者
        )
        db.session.add(user)

    user.last_login_at = datetime.utcnow()
    db.session.commit()
    login_user(user, remember=True)
    flash(f"{user.name} さん、ようこそ。", "success")

    nxt = session.pop("oauth_next", None)
    return redirect(nxt or url_for("main.dashboard"))


# ---------- helpers ----------

def _oauth_enabled() -> bool:
    return bool(
        current_app.config.get("GOOGLE_CLIENT_ID")
        and current_app.config.get("GOOGLE_CLIENT_SECRET")
    )


def _safe_next(target: str | None) -> str | None:
    """オープンリダイレクトを防ぐ. 同じホストの相対パスのみ許可."""
    if not target:
        return None
    # 単純化: スラッシュで始まり、// や \\ で始まらないパスのみ許可
    if target.startswith("/") and not target.startswith("//") and not target.startswith("/\\"):
        return target
    return None
