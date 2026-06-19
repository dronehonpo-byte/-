"""WSGI エントリポイント — gunicorn daiko.wsgi:app で起動."""
from . import create_app

app = create_app()
