"""運転代行マッチング「代行の窓口」— application factory."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import Config
from .extensions import db


def _safe_mkdir(path) -> None:
    """ディレクトリを作成する。読み取り専用FS(サーバーレス)では失敗を無視する。"""
    try:
        Path(path).mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


def create_app(config_class: type | object = Config) -> Flask:
    # サーバーレス(Vercel 等)では /tmp 以外が読み取り専用のため instance_path を上書き可能にする
    instance_dir = os.environ.get("DAIKO_INSTANCE_DIR")
    app = Flask(
        __name__,
        instance_relative_config=False,
        instance_path=str(Path(instance_dir).resolve()) if instance_dir else None,
    )
    app.config.from_object(config_class)

    # Render/Heroku のような proxy 配下では X-Forwarded-* を信頼
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # 読み取り専用FS(サーバーレス)では作成に失敗しても致命的ではないので握り潰す
    _safe_mkdir(app.instance_path)
    _safe_mkdir(app.config["CERT_DIR"])
    # SQLite 利用時は DB ファイルの親ディレクトリを用意
    uri = app.config["SQLALCHEMY_DATABASE_URI"]
    if uri.startswith("sqlite:///") and ":memory:" not in uri:
        _safe_mkdir(Path(uri[len("sqlite:///"):]).parent)

    _validate_secret(app)

    db.init_app(app)

    # ブループリント登録
    from .blueprints.admin import bp as admin_bp
    from .blueprints.auth import bp as auth_bp
    from .blueprints.customer import bp as customer_bp
    from .blueprints.driver import bp as driver_bp
    from .blueprints.main import bp as main_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(driver_bp)
    app.register_blueprint(admin_bp)

    # DB接続エラー時は生の500ではなく分かりやすい案内を返す
    # （context_processorがDBに触れて再度失敗しないよう、テンプレートを使わず素のHTMLを返す）
    from sqlalchemy.exc import OperationalError, DBAPIError

    @app.errorhandler(OperationalError)
    @app.errorhandler(DBAPIError)
    def _handle_db_error(err):
        try:
            db.session.rollback()
        except Exception:
            pass
        html = (
            "<!doctype html><html lang='ja'><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width, initial-scale=1'>"
            "<title>一時的にご利用いただけません</title></head>"
            "<body style='font-family:sans-serif;max-width:34em;margin:16vh auto;padding:0 24px;text-align:center;color:#16241d'>"
            "<div style='font-size:44px'>🛠️</div>"
            "<h1 style='font-size:20px;color:#0a5e34'>ただいま一時的にご利用いただけません</h1>"
            "<p style='color:#5f7367;font-size:14px;line-height:1.8'>データベースに接続できませんでした。"
            "お手数ですが、しばらく経ってから再度お試しください。<br>復旧までしばらくお待ちください。</p>"
            "</body></html>"
        )
        return html, 503

    # テンプレートグローバル
    from .auth import current_admin, current_customer, current_driver
    from .models import (
        PAYMENT_METHODS,
        PAYMENT_METHODS_BY_KEY,
        EntryStatus,
        RequestStatus,
        VendorStatus,
    )

    @app.context_processor
    def inject_globals():
        return {
            "RequestStatus": RequestStatus,
            "EntryStatus": EntryStatus,
            "VendorStatus": VendorStatus,
            "PAYMENT_METHODS": PAYMENT_METHODS,
            "PAYMENT_METHODS_BY_KEY": PAYMENT_METHODS_BY_KEY,
            "service_name": app.config["SERVICE_NAME"],
            "area": app.config["AREA"],
            "operator_name": app.config["OPERATOR_NAME"],
            "contact_email": app.config["CONTACT_EMAIL"],
            "operator_phone": app.config["OPERATOR_PHONE"],
            "map_tile_url": app.config["MAP_TILE_URL"],
            "nominatim_url": app.config["NOMINATIM_URL"],
            "osrm_url": app.config["OSRM_URL"],
            "default_lat": app.config["DEFAULT_LAT"],
            "default_lng": app.config["DEFAULT_LNG"],
            "cur_customer": current_customer(),
            "cur_driver": current_driver(),
            "cur_admin": current_admin(),
        }

    @app.template_filter("dt")
    def fmt_dt(value, fmt: str = "%Y-%m-%d %H:%M"):
        if not value:
            return "—"
        return value.strftime(fmt)

    @app.template_filter("yen")
    def fmt_yen(value):
        if value is None:
            return "—"
        return f"{int(value):,}円"

    # CLI
    from .cli import register_cli

    register_cli(app)

    # SQLite + 非テスト時は create_all で初期化補助（本番 Postgres は seed/migrate 運用）
    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:") and not app.config.get("TESTING"):
        with app.app_context():
            db.create_all()

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
        raise RuntimeError(
            "DAIKO_SECRET_KEY (または SECRET_KEY) を本番用の値に設定してください。"
            " 例: python -c 'import secrets; print(secrets.token_hex(32))'"
        )
