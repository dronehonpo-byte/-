import os


def _db_url() -> str:
    url = os.environ.get("DATABASE_URL", "sqlite:///formmail.db")
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = _db_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:5000").rstrip("/")

    SMTP_HOST = os.environ.get("SMTP_HOST", "localhost")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "25"))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "false").lower() == "true"
    SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "false").lower() == "true"
    MAIL_DEFAULT_FROM = os.environ.get("MAIL_DEFAULT_FROM", "noreply@example.com")

    MAIL_DEBUG_LOG = os.environ.get("MAIL_DEBUG_LOG", "false").lower() == "true"

    NEWSLETTER_BATCH_SIZE = int(os.environ.get("NEWSLETTER_BATCH_SIZE", "50"))
