"""運転代行マッチング「代行の窓口」— アプリケーション設定.

環境変数で挙動を切り替える:
- DAIKO_SECRET_KEY          : Flask SECRET_KEY (本番では必須)
- DATABASE_URL              : DB 接続URL (Render Postgres の postgres:// は自動補正)
- APP_BASE_URL              : 公開URL (例 https://daiko.example.com)
- DAIKO_SERVICE_NAME        : サービス名 (デフォルト: 代行の窓口)
- DAIKO_AREA                : 対応エリア表示 (デフォルト: 栃木県宇都宮市)
- DAIKO_OPERATOR_NAME       : 運営者名
- DAIKO_OPERATOR_PHONE      : 運営者電話番号
- DAIKO_CONTACT_EMAIL       : 問い合わせメール
- DAIKO_ACCOUNT_EMAIL       : アカウントメール
- SMS_BACKEND               : 'twilio' | 'console' (未設定時は console=コードをログ/画面表示)
- TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER : SMS_BACKEND=twilio のとき必須
- DAIKO_ADMIN_ID / DAIKO_ADMIN_PASSWORD : seed コマンドが作る初期管理者
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
    SECRET_KEY = (
        os.environ.get("DAIKO_SECRET_KEY")
        or os.environ.get("SECRET_KEY")
        or "dev-secret-key-change-in-production"
    )

    # --- DB ---
    _db_url = (
        os.environ.get("DAIKO_DATABASE_URI")
        or os.environ.get("DATABASE_URL")
        or f"sqlite:///{INSTANCE_DIR / 'daiko.db'}"
    )
    SQLALCHEMY_DATABASE_URI = _normalize_db_url(_db_url)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # --- ストレージ (公安委員会認定書のアップロード先) ---
    STORAGE_DIR = Path(os.environ.get("DAIKO_STORAGE_DIR", BASE_DIR / "storage"))
    CERT_DIR = STORAGE_DIR / "certs"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_CERT_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp"}

    # --- 公開URL ---
    APP_BASE_URL = (os.environ.get("APP_BASE_URL") or "").rstrip("/")
    PREFERRED_URL_SCHEME = "https" if APP_BASE_URL.startswith("https://") else "http"

    # --- サービス情報 (運営者情報) ---
    SERVICE_NAME = os.environ.get("DAIKO_SERVICE_NAME", "代行の窓口")
    AREA = os.environ.get("DAIKO_AREA", "栃木県宇都宮市")
    OPERATOR_NAME = os.environ.get("DAIKO_OPERATOR_NAME", "Team Rafflesia")
    OPERATOR_PHONE = os.environ.get("DAIKO_OPERATOR_PHONE", "090-7343-8739")
    CONTACT_EMAIL = os.environ.get("DAIKO_CONTACT_EMAIL", "info@daikou-madoguchi.jp")
    ACCOUNT_EMAIL = os.environ.get("DAIKO_ACCOUNT_EMAIL", "monjal1@icloud.com")

    # --- 近隣リクエスト判定 (ドライバーに見せる範囲・km) ---
    NEARBY_RADIUS_KM = float(os.environ.get("DAIKO_NEARBY_RADIUS_KM", "15"))

    # --- SMS 認証 ---
    SMS_BACKEND = (os.environ.get("SMS_BACKEND") or "console").lower()
    TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "")
    OTP_TTL_SECONDS = int(os.environ.get("DAIKO_OTP_TTL_SECONDS", "300"))
    # console バックエンド時、認証コードを画面に表示するか (本番 twilio では常に False)
    OTP_SHOW_IN_RESPONSE = _bool(os.environ.get("DAIKO_OTP_SHOW_IN_RESPONSE"), default=True)

    # --- 地図/経路 (外部サービス) ---
    MAP_TILE_URL = os.environ.get(
        "DAIKO_MAP_TILE_URL", "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
    NOMINATIM_URL = os.environ.get("DAIKO_NOMINATIM_URL", "https://nominatim.openstreetmap.org")
    OSRM_URL = os.environ.get("DAIKO_OSRM_URL", "https://router.project-osrm.org")
    # 宇都宮市役所付近をデフォルト地図中心に
    DEFAULT_LAT = float(os.environ.get("DAIKO_DEFAULT_LAT", "36.5551"))
    DEFAULT_LNG = float(os.environ.get("DAIKO_DEFAULT_LNG", "139.8828"))

    # --- 初期管理者 (seed) ---
    ADMIN_ID = os.environ.get("DAIKO_ADMIN_ID", "admin")
    ADMIN_PASSWORD = os.environ.get("DAIKO_ADMIN_PASSWORD", "")

    # --- Cookie ---
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _bool(
        os.environ.get("SESSION_COOKIE_SECURE"), default=APP_BASE_URL.startswith("https://")
    )

    # --- 環境判定 ---
    ENV = os.environ.get("FLASK_ENV", "production").lower()

    @property
    def IS_PRODUCTION(self) -> bool:  # noqa: N802
        return self.ENV == "production"


class DevelopmentConfig(Config):
    ENV = "development"
    SESSION_COOKIE_SECURE = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret"
    SMS_BACKEND = "console"
    OTP_SHOW_IN_RESPONSE = True
    WTF_CSRF_ENABLED = False
