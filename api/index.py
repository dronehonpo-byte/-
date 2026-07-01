"""Vercel サーバーレス エントリポイント (電子契約 Web アプリ).

Vercel の Python ランタイムはモジュール直下の WSGI アプリ ``app`` を
自動検出して配信する。vercel.json の rewrites で全パスをこの関数へ転送する。

サーバーレス環境の制約と対応:
- ファイルシステムは読み取り専用で、書き込めるのは /tmp のみ。
  → instance / storage / SQLite の書き込み先を /tmp に向ける。
- 環境変数 (ECONTRACT_SECRET_KEY / DATABASE_URL 等) が未設定でも
  デモとして起動できるよう、安全なデフォルトへフォールバックする。
  本番運用では Vercel のダッシュボードで以下を必ず設定すること:
    * ECONTRACT_SECRET_KEY (安定した秘密鍵)
    * DATABASE_URL         (外部 Postgres — サーバーレスの SQLite は揮発性)
    * ECONTRACT_STORAGE_DIR は外部ストレージ非対応のため PDF は永続化されない
  詳細は VERCEL.md を参照。
"""
import os
import secrets

# --- 書き込み可能な一時領域へフォールバック (env が優先) ---
os.environ.setdefault("ECONTRACT_INSTANCE_PATH", "/tmp/econtract-instance")
os.environ.setdefault("ECONTRACT_STORAGE_DIR", "/tmp/econtract-storage")
os.environ.setdefault(
    "ECONTRACT_DATABASE_URI", "sqlite:////tmp/econtract-instance/econtract.db"
)
# 秘密鍵が未設定ならコールドスタートごとに一時鍵を生成 (リポジトリに秘密を置かない)。
# 本番では安定した ECONTRACT_SECRET_KEY をダッシュボードで設定すること。
if not (os.environ.get("ECONTRACT_SECRET_KEY") or os.environ.get("SECRET_KEY")):
    os.environ["ECONTRACT_SECRET_KEY"] = secrets.token_hex(32)

from econtract.wsgi import app  # noqa: E402

# 外部 DB を使わない (揮発性 SQLite の) 場合はテーブルを用意してデモ起動可能にする。
# 外部 DB を使う場合は Flask-Migrate で管理するため作成しない。
if not os.environ.get("DATABASE_URL") and app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
    from econtract.extensions import db

    with app.app_context():
        db.create_all()
