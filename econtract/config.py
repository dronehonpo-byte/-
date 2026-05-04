"""アプリケーション設定.

環境変数で挙動を切り替える:
- ECONTRACT_SECRET_KEY      : Flask SECRET_KEY (本番では必須)
- DATABASE_URL              : DB 接続URL (Render Postgres は postgres:// を返すので postgresql+psycopg2:// に補正)
- APP_BASE_URL              : 公開URL (例 https://econtract.miyabee.jp) — メールに署名URLを埋めるのに使用
- ECONTRACT_COMPANY_NAME    : 自社名
- ECONTRACT_DEFAULT_FROM    : メール差出人 (例 noreply@miyabee.jp)
- ECONTRACT_DEFAULT_FROM_NAME : 差出人表示名
- EMAIL_BACKEND             : 'sendgrid' | 'smtp' | 'console' (未設定時は console=ログ出力のみ)
- SENDGRID_API_KEY          : EMAIL_BACKEND=sendgrid のとき必須
- SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_USE_TLS : EMAIL_BACKEND=smtp のとき
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET : Google OAuth (未設定時は OAuth 無効)
- GOOGLE_HOSTED_DOMAIN      : 許可する Workspace ドメイン (例 miyabee.jp) — 未設定時は全許可
- ALLOW_PASSWORD_LOGIN      : 'true' でメール+パスワード ログインも有効化 (デフォルト: OAuth 未設定なら true / 設定済なら false)
- DISABLE_REGISTRATION      : 'true' でブラウザからのアカウント作成を無効化
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"


def _bool(v: str | None, default: bool = False) -> bool:
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


def _normalize_db_url(url: str) -> str:
    """Render/Heroku の `postgres://` を SQLAlchemy 用に補正."""
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and "+psycopg2" not in url and "+asyncpg" not in url:
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


class Config:
    # --- Flask ---
    SECRET_KEY = os.environ.get("ECONTRACT_SECRET_KEY") or os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"

    # --- DB ---
    _db_url = (
        os.environ.get("ECONTRACT_DATABASE_URI")
        or os.environ.get("DATABASE_URL")
        or f"sqlite:///{INSTANCE_DIR / 'econtract.db'}"
    )
    SQLALCHEMY_DATABASE_URI = _normalize_db_url(_db_url)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # --- ストレージ ---
    STORAGE_DIR = Path(os.environ.get("ECONTRACT_STORAGE_DIR", BASE_DIR / "storage"))
    CONTRACT_PDF_DIR = STORAGE_DIR / "contracts"
    SIGNATURE_DIR = STORAGE_DIR / "signatures"

    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32MB
    ALLOWED_EXTENSIONS = {"pdf"}

    # --- 公開URL (メールに埋める署名URLの絶対URL生成に使う) ---
    APP_BASE_URL = (os.environ.get("APP_BASE_URL") or "").rstrip("/")
    PREFERRED_URL_SCHEME = "https" if APP_BASE_URL.startswith("https://") else "http"

    # --- 自社情報 ---
    COMPANY_NAME = os.environ.get("ECONTRACT_COMPANY_NAME", "株式会社サンプル")

    # --- メール ---
    EMAIL_BACKEND = (os.environ.get("EMAIL_BACKEND") or "console").lower()
    DEFAULT_FROM_EMAIL = os.environ.get("ECONTRACT_DEFAULT_FROM", "noreply@example.com")
    DEFAULT_FROM_NAME = os.environ.get("ECONTRACT_DEFAULT_FROM_NAME", COMPANY_NAME + " 電子契約")
    SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
    SMTP_HOST = os.environ.get("SMTP_HOST", "")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    SMTP_USE_TLS = _bool(os.environ.get("SMTP_USE_TLS"), True)

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_HOSTED_DOMAIN = os.environ.get("GOOGLE_HOSTED_DOMAIN", "")  # e.g. miyabee.jp

    @property
    def OAUTH_ENABLED(self) -> bool:  # noqa: N802
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)

    # --- ログイン挙動 ---
    ALLOW_PASSWORD_LOGIN = _bool(
        os.environ.get("ALLOW_PASSWORD_LOGIN"),
        default=not bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
    )
    DISABLE_REGISTRATION = _bool(os.environ.get("DISABLE_REGISTRATION"), default=False)

    # --- Cookie ---
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _bool(os.environ.get("SESSION_COOKIE_SECURE"), default=APP_BASE_URL.startswith("https://"))
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = SESSION_COOKIE_SECURE

    # --- 環境判定 ---
    ENV = os.environ.get("FLASK_ENV", "production").lower()

    @property
    def IS_PRODUCTION(self) -> bool:  # noqa: N802
        return self.ENV == "production"


class DevelopmentConfig(Config):
    ENV = "development"
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SECRET_KEY = "test-secret"
    EMAIL_BACKEND = "console"
