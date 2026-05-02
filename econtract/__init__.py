"""電子契約管理アプリ."""
from __future__ import annotations

from pathlib import Path

from flask import Flask

from .config import Config
from .extensions import db, login_manager


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__, instance_relative_config=False)
    app.config.from_object(config_class)

    # ストレージ・instance ディレクトリ準備
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    Path(app.config["CONTRACT_PDF_DIR"]).mkdir(parents=True, exist_ok=True)
    Path(app.config["SIGNATURE_DIR"]).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    login_manager.init_app(app)

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

    # テンプレートグローバル
    from .models import ContractStatus, SignerStatus

    @app.context_processor
    def inject_globals():
        return {
            "ContractStatus": ContractStatus,
            "SignerStatus": SignerStatus,
            "company_name": app.config["COMPANY_NAME"],
        }

    @app.template_filter("dt")
    def fmt_dt(value, fmt: str = "%Y-%m-%d %H:%M"):
        if not value:
            return "—"
        return value.strftime(fmt)

    # CLI コマンド
    from .cli import register_cli
    register_cli(app)

    with app.app_context():
        db.create_all()

    return app
