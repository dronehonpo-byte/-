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
def test_page_runs(page):
    at = AppTest.from_file(str(page), default_timeout=60)
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
    at.run()
    assert not at.exception
