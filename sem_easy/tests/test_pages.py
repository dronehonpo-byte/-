"""画面（Streamlit ページ）の動作確認と、認証の検証。"""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import pytest
from streamlit.testing.v1 import AppTest

from modules import auth, data_loader
from modules.model_spec import ModelSpec
from modules import estimator

ROOT = Path(__file__).resolve().parent.parent
PAGES = sorted((ROOT / "pages").glob("[0-9]*.py"))


def _authed_state(at):
    """ログイン済みの状態を作る。"""
    at.session_state["auth_user"] = "tester"
    at.session_state["auth_started_at"] = datetime.now(auth.JST).isoformat(timespec="seconds")
    return at


def _loaded_state(at, user="tester"):
    df = pd.read_csv(ROOT / "sample_data" / "sample_媒介モデル.csv")
    res = data_loader.LoadResult(kind=data_loader.INDIVIDUAL, data=df, n=len(df))
    at.session_state[auth.session_key(user, "load_result")] = res
    at.session_state[auth.session_key(user, "scales")] = {c: "連続尺度" for c in df.columns}
    at.session_state[auth.session_key(user, "estimator")] = "MLW"
    at.session_state[auth.session_key(user, "missing")] = "listwise"
    spec = ModelSpec(regressions=[("研修参加度", "自己効力感"), ("自己効力感", "業務成果"),
                                  ("研修参加度", "業務成果")])
    at.session_state[auth.session_key(user, "spec")] = spec
    at.session_state[auth.session_key(user, "sem_result")] = estimator.estimate(df, spec)
    return at


@pytest.mark.parametrize("page", PAGES, ids=[p.name for p in PAGES])
def test_page_requires_login(page):
    """未ログインでは、どのページも中身を表示せずログイン画面で止まること。"""
    at = AppTest.from_file(str(page), default_timeout=90)
    at.run()
    assert len(at.text_input) >= 2, f"{page.name}: ログイン入力欄が表示されていない"
    assert "auth_user" not in at.session_state


@pytest.mark.parametrize("page", PAGES, ids=[p.name for p in PAGES])
def test_page_runs_when_logged_in(page):
    """ログイン済みなら、各ページが例外なく描画されること。"""
    at = AppTest.from_file(str(page), default_timeout=90)
    _authed_state(at)
    _loaded_state(at)
    at.run()
    real = [e for e in at.exception if "url_pathname" not in str(e.value)]
    assert not real, f"{page.name} で例外: {real}"


def test_app_entry_runs():
    at = AppTest.from_file(str(ROOT / "app.py"), default_timeout=90)
    _authed_state(at)
    at.run()
    real = [e for e in at.exception if "url_pathname" not in str(e.value)]
    assert not real


# ---------- 認証そのものの検証 ----------

def test_password_is_hashed_not_plaintext(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "USERS_FILE", tmp_path / "u.json")
    auth.create_user("alice", "SuperSecret123")
    raw = (tmp_path / "u.json").read_text(encoding="utf-8")
    assert "SuperSecret123" not in raw          # 平文が保存されない
    assert auth.authenticate("alice", "SuperSecret123")[0]
    assert not auth.authenticate("alice", "wrong")[0]


def test_unknown_user_message_is_generic(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "USERS_FILE", tmp_path / "u.json")
    auth.create_user("alice", "pw12345678")
    ok1, m1 = auth.authenticate("bob", "pw12345678")     # 存在しないID
    ok2, m2 = auth.authenticate("alice", "wrongpass")    # 誤ったパスワード
    assert not ok1 and not ok2
    assert "正しくありません" in m1 and "正しくありません" in m2


def test_lockout_after_repeated_failures(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "USERS_FILE", tmp_path / "u.json")
    auth.create_user("carol", "pw12345678")
    for _ in range(auth.MAX_FAILURES):
        auth.authenticate("carol", "bad")
    ok, msg = auth.authenticate("carol", "pw12345678")   # 正しくてもロック中
    assert not ok
    assert "ロック" in msg


def test_expired_account_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "USERS_FILE", tmp_path / "u.json")
    past = (datetime.now(auth.JST) - timedelta(days=1)).date().isoformat()
    auth.create_user("dave", "pw12345678", expires=past)
    ok, msg = auth.authenticate("dave", "pw12345678")
    assert not ok and "利用期限" in msg


def test_user_data_separation():
    """利用者ごとにセッションのキーが分離されること。"""
    assert auth.session_key("a", "df") != auth.session_key("b", "df")
    assert auth.session_key("a", "df").startswith("u::a::")
