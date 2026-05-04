"""WSGI エントリポイント.

開発:
  flask --app econtract.wsgi run --debug
本番:
  gunicorn -c econtract/gunicorn.conf.py econtract.wsgi:app
"""
import os

# .env を読み込む (本番ではプラットフォームの env を使うので無視される)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from . import create_app  # noqa: E402

app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
