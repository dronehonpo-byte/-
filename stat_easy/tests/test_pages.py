"""Streamlit ページの統合スモークテスト（AppTest で各ページを実行）。

データをセッションに注入した状態で各ページを実行し、例外なく描画できることを確認する。
"""
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

from modules import data_loader

ROOT = Path(__file__).resolve().parent.parent
PAGES = sorted((ROOT / "pages").glob("[0-9]*.py"))


def _load_sample():
    res = data_loader.load(str(ROOT / "sample_data" / "sample_experiment.csv"),
                           "sample_experiment.csv")
    return res


@pytest.mark.parametrize("page", PAGES, ids=[p.name for p in PAGES])
def test_page_blocked_without_password(page):
    """未認証では各ページが直接アクセスされてもログイン画面で止まること。"""
    at = AppTest.from_file(str(page), default_timeout=60)
    res = _load_sample()
    at.session_state["df"] = res.df
    at.session_state["column_types"] = res.column_types
    at.session_state["source_name"] = res.source_name
    at.run()
    # ログイン用パスワード入力欄が出て、本体は描画されない
    assert len(at.text_input) >= 1, f"{page.name}: 未認証なのにログイン欄が無い"
    assert "stateasy_authed" not in at.session_state


@pytest.mark.parametrize("page", PAGES, ids=[p.name for p in PAGES])
def test_page_runs(page):
    at = AppTest.from_file(str(page), default_timeout=60)
    at.session_state["stateasy_authed"] = True  # パスワードゲート通過済み扱い
    res = _load_sample()
    at.session_state["df"] = res.df
    at.session_state["column_types"] = res.column_types
    at.session_state["source_name"] = res.source_name
    at.run()
    # st.page_link / st.switch_page は本番では app.py の st.navigation が
    # ページレジストリを構築するため正常動作するが、AppTest で単体実行すると
    # レジストリが無く 'url_pathname' KeyError になる。これはテスト環境固有の
    # 制約なので、その例外のみ許容して実際のロジックエラーを検出する。
    real_exceptions = [
        e for e in at.exception if "url_pathname" not in str(e.value)
    ]
    assert not real_exceptions, f"{page.name} で例外: {real_exceptions}"


def test_app_entry_runs():
    at = AppTest.from_file(str(ROOT / "app.py"), default_timeout=60)
    # パスワードゲートを通過した状態で本体が動くこと
    at.session_state["stateasy_authed"] = True
    at.run()
    assert not at.exception


def test_password_gate_blocks_and_accepts():
    # 未認証だとログインフォームが出て本体（サイドバー見出し）は出ない
    at = AppTest.from_file(str(ROOT / "app.py"), default_timeout=60)
    at.run()
    assert not at.exception
    assert len(at.text_input) >= 1, "ログイン用パスワード入力欄が表示されるはず"

    # 誤ったパスワードでは認証されない
    at.text_input[0].set_value("wrong").run()
    at.button[0].click().run()
    assert "stateasy_authed" not in at.session_state

    # 正しいパスワードで認証される
    at.text_input[0].set_value("STAT0703").run()
    at.button[0].click().run()
    assert at.session_state["stateasy_authed"] is True


def test_web_build_module_consistency():
    """Web(stlite)版に同梱するページが、同梱していないモジュールに依存しないこと。

    予測系モジュールを外した際に、残ページの dead import で Web 版が
    ImportError で壊れる事故を防ぐ。
    """
    import re

    build_src = (ROOT / "web" / "_build_index.py").read_text(encoding="utf-8")
    included = re.findall(r'"((?:modules|pages|exporters)/[^"]+\.py)"', build_src)
    bundled_modules = {p.split("/")[1][:-3] for p in included if p.startswith("modules/")}

    for page in [p for p in included if p.startswith("pages/")]:
        src = (ROOT / page).read_text(encoding="utf-8")
        for grp in re.findall(r"from modules import ([^\n]+)", src):
            for name in [x.strip() for x in grp.split(",")]:
                assert name in bundled_modules, (
                    f"{page} が Web 版未同梱のモジュール modules/{name} を import しています"
                )
