"""StatEasy — Excel/CSV 対応 自動統計解析ツール（メインエントリーポイント）。

  streamlit run app.py

で起動する。研究目的ベースのメニューを左サイドバーに表示する。

開発：土居拓務・株式会社Miyabee
"""
from __future__ import annotations

import streamlit as st

from modules.common import load_css, render_sidebar_credit

st.set_page_config(
    page_title="StatEasy — 自動統計解析ツール",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

load_css()

# ---- 研究目的ベースのナビゲーション ----
home = st.Page("pages/00_home.py", title="ホーム / 使い方ガイド", icon="🏠", default=True)
upload = st.Page("pages/01_upload.py", title="データアップロード", icon="📁")

quality = st.Page("pages/02_quality.py", title="データ品質診断", icon="🔍")
descriptive = st.Page("pages/03_descriptive.py", title="記述統計・Table 1", icon="📋")

hypothesis = st.Page("pages/04_hypothesis.py", title="群の違いを調べる", icon="⚖️")
effect = st.Page("pages/05_effect.py", title="効果量・信頼区間", icon="📏")

regression = st.Page("pages/06_regression.py", title="変数間の関係を調べる", icon="🔗")

cluster = st.Page("pages/08_clustering.py", title="グループに分ける", icon="🧩")

visualization = st.Page("pages/09_visualization.py", title="図表を出力する", icon="🎨")

nav = st.navigation(
    {
        "はじめに": [home, upload],
        "データを確認したい": [quality, descriptive],
        "群の違いを調べたい": [hypothesis, effect],
        "変数間の関係を調べたい": [regression],
        "グループに分けたい": [cluster],
        "図表を出力する": [visualization],
    }
)

st.sidebar.markdown("## 📊 StatEasy")
st.sidebar.caption("統計の面白さを、手法名を知らなくても。")
render_sidebar_credit()

nav.run()
