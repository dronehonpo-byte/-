from flask import Flask, redirect, url_for

from .config import Config
from .extensions import db, login_manager, migrate


def create_app(config_object: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "ログインしてください"
    login_manager.login_message_category = "error"

    from .models import User

    @login_manager.user_loader
    def _load_user(user_id: str):
        return db.session.get(User, int(user_id))

    from . import auth, dashboard, forms_bp, newsletter

    app.register_blueprint(dashboard.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(forms_bp.bp)
    app.register_blueprint(forms_bp.public_bp)
    app.register_blueprint(newsletter.bp)
    app.register_blueprint(newsletter.public_bp)

    @app.route("/")
    def root():
        return redirect(url_for("dashboard.index"))

    @app.cli.command("init-db")
    def init_db():
        """Create all tables (use this instead of migrations for quick start)."""
        with app.app_context():
            db.create_all()
            print("Tables created.")

    return app
