"""WSGI エントリポイント.

`gunicorn wsgi:app`（rootDir=daiko）と `gunicorn daiko.wsgi:app`（リポジトリroot）の
どちらで読み込まれても動くよう、リポジトリルートを import パスに追加してから
絶対 import で `daiko` パッケージを解決する。
"""
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from daiko import create_app  # noqa: E402

app = create_app()
