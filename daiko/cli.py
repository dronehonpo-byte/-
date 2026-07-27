"""管理用 CLI コマンド."""
from __future__ import annotations

import secrets

import click
from flask import Flask

from .extensions import db
from .models import Admin, Driver, Vendor, VendorStatus
from .services.sms import normalize_phone


def register_cli(app: Flask) -> None:
    @app.cli.command("init-db")
    def init_db():
        """テーブルを作成する."""
        db.create_all()
        click.echo("DB を初期化しました。")

    @app.cli.command("seed-demo")
    def seed_demo():
        """デモ/テスト用データ（管理者・デモ客・デモ業者2社・サンプル依頼）を冪等に投入する.

        テスト段階向け。ドライバーのテストログイン（09024963656 / 09033334444, パス demo123）や
        デモ客（09011112222）が作成される。
        """
        from .seed import ensure_seed
        from .services import push

        ensure_seed(app, demo=True)
        with app.app_context():
            push.ensure_schema()
        click.echo("デモ/テストデータを投入しました。")

    @app.cli.command("seed-prod")
    def seed_prod():
        """本番用：管理者アカウントのみを冪等に用意（デモ業者・客は作らない）."""
        from .models import Admin
        from .services import push

        db.create_all()
        admin_id = app.config["ADMIN_ID"]
        if Admin.query.filter_by(login_id=admin_id).first() is None:
            admin = Admin(login_id=admin_id)
            admin.set_password(app.config["ADMIN_PASSWORD"] or "adminpass")
            db.session.add(admin)
            db.session.commit()
        push.ensure_schema()
        click.echo("本番用の初期化が完了しました（管理者のみ）。")

    @app.cli.command("reset-data")
    def reset_data():
        """運用データ（業者・利用者・依頼など）を全消去（管理者は残す）."""
        from .services import maintenance

        n = maintenance.wipe_operational_data()
        click.echo(f"運用データを初期化しました（利用者 {n} 件ほか全削除・管理者は保持）。")

    @app.cli.command("seed")
    def seed():
        """初期管理者と参加業者（エンペラー代行）を投入する."""
        db.create_all()

        # ── 管理者 ──
        admin_id = app.config["ADMIN_ID"]
        admin = Admin.query.filter_by(login_id=admin_id).first()
        if admin is None:
            password = app.config["ADMIN_PASSWORD"] or secrets.token_urlsafe(9)
            admin = Admin(login_id=admin_id)
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            click.echo(f"管理者を作成: id={admin_id} / password={password}")
            if not app.config["ADMIN_PASSWORD"]:
                click.echo("  ※ パスワードは自動生成しました。控えてください。")
        else:
            click.echo(f"管理者は既に存在します: {admin_id}")

        # ── 参加業者: エンペラー代行（実装テスト用の1社） ──
        vendor = Vendor.query.filter_by(name="エンペラー代行").first()
        if vendor is None:
            vendor = Vendor(
                name="エンペラー代行",
                phone=normalize_phone("090-2496-3656"),
                status=VendorStatus.APPROVED,  # テスト用に承認済みで投入
            )
            db.session.add(vendor)
            db.session.flush()
            driver = Driver(vendor_id=vendor.id, name="エンペラー代行 ドライバー", phone=normalize_phone("090-2496-3656"))
            dpw = secrets.token_urlsafe(6)
            driver.set_password(dpw)
            db.session.add(driver)
            db.session.commit()
            click.echo(f"業者を作成: エンペラー代行 / ドライバーログイン phone=09024963656 password={dpw}")
        else:
            click.echo("業者『エンペラー代行』は既に存在します。")

    @app.cli.command("create-admin")
    @click.argument("login_id")
    @click.argument("password")
    def create_admin(login_id: str, password: str):
        """管理者を追加する."""
        if Admin.query.filter_by(login_id=login_id).first():
            click.echo("既に存在します。")
            return
        admin = Admin(login_id=login_id)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        click.echo(f"管理者を作成: {login_id}")
