"""Vercel サーバーレス・エントリポイント — 「代行の窓口」(daiko) のプレビュー用.

Vercel の @vercel/python ランタイムはこのモジュール内の `app` (WSGI) を配信する。
書き込み可能なのは /tmp のみなので DB・ストレージを /tmp に向け、起動時にデモ用の
初期データを投入してそのままブラウズできるようにする。
"""
import os
import sys

# リポジトリルートを import パスに追加（`import daiko` を可能にする）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Vercel では /tmp だけが書き込み可能
os.environ.setdefault("DAIKO_DATABASE_URI", "sqlite:////tmp/daiko.db")
os.environ.setdefault("DAIKO_STORAGE_DIR", "/tmp/daiko-storage")
# プレビュー専用キー（本番では Vercel の環境変数で上書きすること）
os.environ.setdefault("DAIKO_SECRET_KEY", "preview-only-not-a-real-secret")
os.environ.setdefault("DAIKO_ADMIN_PASSWORD", "adminpass")
os.environ.setdefault("FLASK_ENV", "production")

from daiko import create_app  # noqa: E402
from daiko.seed import ensure_seed  # noqa: E402

app = create_app()

try:
    ensure_seed(app)
except Exception as exc:  # プレビューのシードに失敗してもアプリ自体は配信する
    app.logger.warning("preview seed skipped: %s", exc)
