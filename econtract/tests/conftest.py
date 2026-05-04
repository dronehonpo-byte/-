import os
import sys
import tempfile
from pathlib import Path

import pytest

# econtract パッケージを import 可能に
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("FLASK_ENV", "testing")


@pytest.fixture
def app(tmp_path, monkeypatch):
    storage = tmp_path / "storage"
    storage.mkdir()
    monkeypatch.setenv("ECONTRACT_STORAGE_DIR", str(storage))

    from econtract import create_app
    from econtract.config import TestingConfig

    class _Cfg(TestingConfig):
        STORAGE_DIR = storage
        CONTRACT_PDF_DIR = storage / "contracts"
        SIGNATURE_DIR = storage / "signatures"
        APP_BASE_URL = "https://test.example.com"

    app = create_app(_Cfg)
    with app.app_context():
        from econtract.extensions import db
        db.create_all()
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db_session(app):
    from econtract.extensions import db
    with app.app_context():
        yield db.session
