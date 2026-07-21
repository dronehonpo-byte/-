"""Vercel サーバーレス用エントリポイント.

Vercel の Python ランタイムはこのファイル内の `app` (WSGI アプリ) を呼び出す。
環境変数が未設定でも「とりあえずURLが開く」ように最小限のデフォルトを与える。
Vercel のファイルシステムは /tmp 以外が読み取り専用なので、書き込み先を /tmp に向ける。

※ これはプレビュー/動作確認用の構成です。DB(SQLite in /tmp) はリクエストをまたいで
   永続しないため、実運用では Neon/Supabase などの外部 Postgres と S3 等の
   外部ストレージへ切り替えてください。
"""
import os

# 書き込み可能な /tmp を使う
os.environ.setdefault("ECONTRACT_DATABASE_URI", "sqlite:////tmp/econtract.db")
os.environ.setdefault("ECONTRACT_STORAGE_DIR", "/tmp/econtract-storage")
# 本番モードは SECRET_KEY 必須。未設定でも起動できるようフォールバックを入れる
# (Vercel の環境変数で ECONTRACT_SECRET_KEY を設定すればそちらが優先される)
os.environ.setdefault("ECONTRACT_SECRET_KEY", "vercel-preview-change-me-000000000000")

import sys
from pathlib import Path

# リポジトリルートを import パスに追加 (econtract パッケージを解決するため)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from econtract import create_app  # noqa: E402

app = create_app()
