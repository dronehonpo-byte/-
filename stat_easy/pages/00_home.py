"""ホーム / オンボーディング・チュートリアルページ。"""
from __future__ import annotations

from pathlib import Path

import streamlit as st

from modules import common, data_loader

common.load_css()

# ---- ヒーローバナー ----
st.markdown(
    """
    <div class="stateasy-hero">
        <h1>StatEasy</h1>
        <p>統計の面白さを、もっと身近に。<br>
        データを読み込むだけで、診断から検定・可視化・出力までを一気通貫で。</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---- 3ステップの使い方ガイド ----
st.subheader("使い方は 3 ステップ")
steps = [
    ("①", "データを読み込む", "CSV / Excel をアップロード、またはサンプルデータを選ぶだけ。文字コードや列の型は自動で判定します。"),
    ("②", "目的のメニューを選ぶ", "品質診断・記述統計・仮説検定など、やりたいことに合わせてメニューを選択します。"),
    ("③", "結果を解釈・出力する", "なぜその手法かの説明つきで結果を表示。図表は Excel / Word / PDF / 画像で出力できます。"),
]
cols = st.columns(3)
for col, (num, title, desc) in zip(cols, steps):
    with col:
        st.markdown(
            f"""
            <div class="stateasy-card">
                <h2 style="margin:0;">{num}</h2>
                <h4 style="margin:0.3rem 0;">{title}</h4>
                <p style="margin:0;color:#5A6B7B;">{desc}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

st.divider()

# ---- サンプルデータで試す ----
st.subheader("サンプルデータで試す")
st.caption("実際のデータがなくても、用意したサンプルですぐに体験できます。")

SAMPLES = [
    ("実験データ", "sample_experiment.csv", "2 群以上の比較・効果量の体験に。"),
    ("アンケートデータ", "sample_survey.csv", "カテゴリ集計・相関の体験に。"),
    ("時系列データ", "sample_timeseries.csv", "推移の記述・可視化の体験に。"),
]


def _load_sample(filename: str) -> None:
    path = Path(common.SAMPLE_DIR) / filename
    result = data_loader.load(str(path), filename)
    st.session_state["df"] = result.df
    st.session_state["column_types"] = result.column_types
    st.session_state["source_name"] = result.source_name
    st.success(f"サンプル『{filename}』を読み込みました（{result.df.shape[0]} 行 × {result.df.shape[1]} 列）。")
    st.switch_page("pages/02_quality.py")


scols = st.columns(3)
for col, (label, filename, desc) in zip(scols, SAMPLES):
    with col:
        st.markdown(f"**{label}**")
        st.caption(desc)
        if st.button(f"{label}を読み込む", key=f"sample_{filename}", use_container_width=True):
            try:
                _load_sample(filename)
            except Exception as e:  # noqa: BLE001
                st.error(str(e))

st.divider()

# ---- 機能の概要カード ----
st.subheader("できること")
FEATURES = [
    ("品質診断", "欠損・外れ値・重複を自動チェックし、対処のヒントを提示。"),
    ("記述統計", "数値・カテゴリの要約や APA 形式の Table 1 を作成。"),
    ("仮説検定", "2 群／多群を自動判定し、前提確認のうえ最適な検定を選択。"),
    ("効果量", "Cohen's d・η²・Cramér's V などを信頼区間つきで算出。"),
    ("クラスタリング", "最適なクラスタ数の提案・k-means・階層クラスタリング。"),
    ("図表出力", "図は PNG / SVG、表は Excel / Word / PDF で出力。"),
]
fcols = st.columns(4)
for i, (title, desc) in enumerate(FEATURES):
    with fcols[i % 4]:
        st.markdown(
            f"""
            <div class="stateasy-card">
                <h4 style="margin:0 0 0.3rem 0;">{title}</h4>
                <p style="margin:0;color:#5A6B7B;font-size:0.9rem;">{desc}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

st.divider()

# ---- 再現性に関する重要事項 ----
st.info(
    "**再現性について**：StatEasy の統計計算は SciPy / statsmodels / scikit-learn のみで行います。"
    "生成 AI は一切利用しないため、同じデータからは常に同じ結果が得られ、研究・報告での再現性を担保します。"
)

common.render_footer()
