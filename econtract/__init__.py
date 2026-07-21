"""電子契約管理アプリ — application factory."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import Config
from .extensions import db, login_manager, migrate, oauth


def create_app(config_class: type | object = Config) -> Flask:
    app = Flask(__name__, instance_relative_config=False)
    app.config.from_object(config_class)

    # Render/Heroku のような proxy 配下では X-Forwarded-* を信頼
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # ストレージ・instance ディレクトリ準備
    # (Vercel など読み取り専用FSでは作成に失敗しうるので起動をブロックしない)
    for _d in (
        Path(app.instance_path),
        Path(app.config["CONTRACT_PDF_DIR"]),
        Path(app.config["SIGNATURE_DIR"]),
    ):
        try:
            _d.mkdir(parents=True, exist_ok=True)
        except OSError:
            app.logger.warning("ディレクトリを作成できませんでした (読み取り専用FS?): %s", _d)

    # 本番では SECRET_KEY が dev デフォルトのままだと拒否
    _validate_secret(app)

    # 拡張初期化
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    oauth.init_app(app)
    _register_oauth_clients(app)

    from .models import User

    @login_manager.user_loader
    def load_user(user_id: str):  # noqa: D401
        return User.query.get(int(user_id))

    # ブループリント登録
    from .blueprints.auth import bp as auth_bp
    from .blueprints.contracts import bp as contracts_bp
    from .blueprints.main import bp as main_bp
    from .blueprints.sign import bp as sign_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(contracts_bp)
    app.register_blueprint(sign_bp)

    # ヘルスチェック
    @app.route("/healthz")
    def _healthz():
        return {"status": "ok"}, 200

    # テンプレートグローバル
    from .models import ContractStatus, SignerStatus

    @app.context_processor
    def inject_globals():
        return {
            "ContractStatus": ContractStatus,
            "SignerStatus": SignerStatus,
            "company_name": app.config["COMPANY_NAME"],
            "oauth_enabled": bool(app.config.get("GOOGLE_CLIENT_ID") and app.config.get("GOOGLE_CLIENT_SECRET")),
            "allow_password_login": app.config.get("ALLOW_PASSWORD_LOGIN", True),
            "allow_registration": not app.config.get("DISABLE_REGISTRATION", False),
        }

    @app.template_filter("dt")
    def fmt_dt(value, fmt: str = "%Y-%m-%d %H:%M"):
        if not value:
            return "—"
        return value.strftime(fmt)

    # CLI
    from .cli import register_cli
    register_cli(app)

    # SQLite + dev 環境のみ create_all で初期化補助 (本番は flask db upgrade)
    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:") and not app.config.get("TESTING"):
        try:
            with app.app_context():
                db.create_all()
        except Exception:  # noqa: BLE001 — 読み取り専用FS等でもアプリ起動は継続
            app.logger.warning("SQLite の初期化に失敗しました。DB機能は利用できない可能性があります。")

    # ロギング (gunicorn で動くときは gunicorn のロガーに合わせる)
    if not app.debug:
        gunicorn_logger = logging.getLogger("gunicorn.error")
        if gunicorn_logger.handlers:
            app.logger.handlers = gunicorn_logger.handlers
            app.logger.setLevel(gunicorn_logger.level)

    return app


def _validate_secret(app: Flask) -> None:
    if app.config.get("TESTING"):
        return
    if (
        os.environ.get("FLASK_ENV", "production").lower() == "production"
        and app.config["SECRET_KEY"] == "dev-secret-key-change-in-production"
        and not app.debug
    ):
        # dev 用のキーで本番起動しないようにブロック
        raise RuntimeError(
            "ECONTRACT_SECRET_KEY (or SECRET_KEY) を本番用の値に設定してください。"
            " 例: python -c 'import secrets; print(secrets.token_hex(32))'"
        )


def _register_oauth_clients(app: Flask) -> None:
    """Google OAuth クライアントを必要なら登録."""
    if not (app.config.get("GOOGLE_CLIENT_ID") and app.config.get("GOOGLE_CLIENT_SECRET")):
        return

    # Workspace ドメイン制限を hd パラメータでサーバーサイドにヒント
    authorize_params = {}
    if app.config.get("GOOGLE_HOSTED_DOMAIN"):
        authorize_params["hd"] = app.config["GOOGLE_HOSTED_DOMAIN"]

    oauth.register(
        name="google",
        client_id=app.config["GOOGLE_CLIENT_ID"],
        client_secret=app.config["GOOGLE_CLIENT_SECRET"],
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
        authorize_params=authorize_params or None,
    )
