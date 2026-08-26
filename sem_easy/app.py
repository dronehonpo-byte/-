"""SEMEasy — 共分散構造分析（SEM）支援ツール（エントリーポイント）。

  streamlit run app.py

推奨フロー：① データ読込 → ② 入力検査 → ③ モデル作成 → ④ 推定 → ⑤ 結果・出力

開発：株式会社Miyabee
"""
from __future__ import annotations

import streamlit as st

from modules import auth
from modules.common import APP_NAME, render_sidebar

st.set_page_config(
    page_title=f"{APP_NAME} — 共分散構造分析ツール",
    page_icon="📐",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---- ID・パスワード認証（全ページの前提）----
user_id = auth.require_login()

home = st.Page("pages/00_home.py", title="ホーム / 使い方", icon="🏠", default=True)
p1 = st.Page("pages/01_data.py", title="① データ読込", icon="📂")
p2 = st.Page("pages/02_check.py", title="② 入力検査・尺度の確認", icon="🔍")
p3 = st.Page("pages/03_model.py", title="③ モデル作成", icon="🧩")
p4 = st.Page("pages/04_estimate.py", title="④ 推定", icon="⚙️")
p5 = st.Page("pages/05_result.py", title="⑤ 結果・出力", icon="📊")

nav = st.navigation({
    "はじめに": [home],
    "分析の手順": [p1, p2, p3, p4, p5],
})

render_sidebar(user_id)
nav.run()
