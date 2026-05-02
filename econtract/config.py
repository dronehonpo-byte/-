"""アプリケーション設定."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Config:
    SECRET_KEY = os.environ.get("ECONTRACT_SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "ECONTRACT_DATABASE_URI",
        f"sqlite:///{BASE_DIR / 'instance' / 'econtract.db'}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    STORAGE_DIR = BASE_DIR / "storage"
    CONTRACT_PDF_DIR = STORAGE_DIR / "contracts"
    SIGNATURE_DIR = STORAGE_DIR / "signatures"

    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32MB
    ALLOWED_EXTENSIONS = {"pdf"}

    COMPANY_NAME = os.environ.get("ECONTRACT_COMPANY_NAME", "株式会社サンプル")

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    REMEMBER_COOKIE_HTTPONLY = True
