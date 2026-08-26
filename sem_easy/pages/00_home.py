"""ホーム：使い方ガイドとサンプルデータ。"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from modules import auth, common, data_loader

user_id = auth.require_login()

st.markdown(
    "<div style='background:linear-gradient(135deg,#1E4E79,#2E7BB8);color:#fff;"
    "padding:1.4rem 1.6rem;border-radius:10px;'>"
    "<h1 style='margin:0;color:#fff;'>SEMEasy</h1>"
    "<p style='margin:.35rem 0 0;opacity:.92;'>共分散構造分析（SEM）を、"
    "手順に沿って進められる支援ツールです。</p></div>",
    unsafe_allow_html=True,
)

st.subheader("分析の流れ（5段階）")
cols = st.columns(5)
steps = [
    ("① データ読込", "Excel / CSV、相関行列・共分散行列を読み込みます。"),
    ("② 入力検査", "変数の尺度を確認し、推定法の推奨理由を確認します。"),
    ("③ モデル作成", "候補モデルの自動生成、または手動でモデルを組みます。"),
    ("④ 推定", "検証済みライブラリで推定します（生成AIは使いません）。"),
    ("⑤ 結果・出力", "適合度・係数・パス図・レポート・再現コードを出力します。"),
]
for col, (t, d) in zip(cols, steps):
    with col:
        st.markdown(
            f"<div style='background:#F0F4F8;border-left:5px solid #1E4E79;"
            f"border-radius:8px;padding:.8rem;height:150px;'>"
            f"<b style='color:#1E4E79;'>{t}</b>"
            f"<p style='margin:.4rem 0 0;font-size:.85rem;color:#5A6B7B;'>{d}</p></div>",
            unsafe_allow_html=True,
        )

st.divider()
st.subheader("サンプルデータで試す")
st.caption("動作確認用のデータです。期待される結果は README とテストで照合できます。")

SAMPLES = [
    ("正常例（2因子CFA＋パス）", "sample_cfa_正常例.csv", "連続尺度・欠損なし。基本的な確認に。"),
    ("媒介モデル例", "sample_媒介モデル.csv", "X→M→Y。間接効果の確認に（真値 a=.50, b=.40, c'=.30）。"),
    ("順序尺度例（5件法）", "sample_順序尺度_5件法.csv", "リッカート項目。推定法の推奨を確認できます。"),
    ("欠損あり例", "sample_欠損あり.csv", "約8%の欠損。FIML の確認に。"),
    ("問題データ例", "sample_問題データ.csv", "少標本・ほぼ同一変数・文字混入。警告表示の確認に。"),
]

for label, fname, desc in SAMPLES:
    c1, c2 = st.columns([3, 1])
    with c1:
        st.markdown(f"**{label}** — {desc}")
    with c2:
        if st.button("読み込む", key=f"s_{fname}", use_container_width=True):
            path = Path(common.SAMPLE_DIR) / fname
            try:
                with open(path, "rb") as fh:
                    res = data_loader.load_individual(fh, fname)
                common.set_state(user_id, "load_result", res)
                common.set_state(user_id, "scales", None)
                common.set_state(user_id, "sem_result", None)
                st.success(f"『{fname}』を読み込みました（{len(res.data)} 行 × {res.data.shape[1]} 列）。")
                st.switch_page("pages/02_check.py")
            except Exception as e:  # noqa: BLE001
                st.error(f"読み込みに失敗しました：{e}")

st.divider()
st.info(
    "**計算の再現性について**：本アプリの推定は検証済みの SEM ライブラリ（semopy）と "
    "NumPy / SciPy のみで行います。係数の計算に生成 AI は使用していないため、"
    "同じデータ・同じ設定・同じ乱数シードであれば、常に同じ結果が得られます。"
)
st.warning(
    "**解釈上の注意**：適合度が良いことは、そのモデルが唯一正しいことや、"
    "変数間に因果関係があることを証明するものではありません。"
    "本アプリは「数値上あてはまりの良い候補」を示すもので、理論的な正しさは判断しません。"
)

common.render_footer()
