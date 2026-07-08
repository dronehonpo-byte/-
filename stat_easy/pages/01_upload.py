"""① データアップロード・プレビューページ。"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from modules import common, data_loader

common.load_css()

st.title("データアップロード")
st.caption("CSV / Excel(.xlsx) を読み込みます。文字コードと列の型は自動で判定します。")


def _store_result(result) -> None:
    st.session_state["df"] = result.df
    st.session_state["column_types"] = result.column_types
    st.session_state["source_name"] = result.source_name
    # 直近の読み込み結果（エンコーディング・警告の表示用）
    st.session_state["_last_encoding"] = result.encoding
    st.session_state["_last_warnings"] = list(result.warnings)


# ---- ファイルアップロード ----
uploaded = st.file_uploader("ファイルを選択", type=["csv", "xlsx"])
if uploaded is not None:
    try:
        result = data_loader.load(uploaded, uploaded.name)
        _store_result(result)
    except Exception as e:  # noqa: BLE001
        st.error(str(e))

st.divider()

# ---- サンプルデータの代替手段 ----
st.subheader("または サンプルデータを使う")
SAMPLES = {
    "実験データ (sample_experiment.csv)": "sample_experiment.csv",
    "アンケートデータ (sample_survey.csv)": "sample_survey.csv",
}
scol1, scol2 = st.columns([3, 1])
with scol1:
    chosen = st.selectbox("サンプルを選択", list(SAMPLES.keys()), key="sample_select")
with scol2:
    st.write("")
    st.write("")
    if st.button("読み込む", key="load_sample_btn", use_container_width=True):
        filename = SAMPLES[chosen]
        path = Path(common.SAMPLE_DIR) / filename
        try:
            result = data_loader.load(str(path), filename)
            _store_result(result)
        except Exception as e:  # noqa: BLE001
            st.error(str(e))

st.divider()

# ---- 読み込み結果の表示 ----
df = common.get_data()
if df is not None:
    source = st.session_state.get("source_name", "")
    column_types = st.session_state.get("column_types", {})
    encoding = st.session_state.get("_last_encoding")
    warnings = st.session_state.get("_last_warnings", [])

    st.success(
        f"『{source}』を読み込みました（{df.shape[0]} 行 × {df.shape[1]} 列）。"
    )
    if encoding:
        st.caption(f"検出された文字コード：{encoding}")

    for w in warnings:
        st.warning(w)

    # 大規模データ（10万行超）の警告とサンプリング提案
    if df.shape[0] > 100_000:
        st.warning(
            f"⚠️ データが大規模です（{df.shape[0]:,} 行）。"
            "分析によってはメモリ不足や処理時間の増大が起こる可能性があります。"
            "クラスタリングは自動でサブサンプリングされますが、"
            "必要に応じて事前に行数を絞ることをおすすめします。"
        )

    st.subheader("データプレビュー（先頭 50 行）")
    st.dataframe(df.head(50), use_container_width=True)

    st.subheader("検出された列の型")
    type_rows = [
        {"列名": col, "型": column_types.get(col, "—")} for col in df.columns
    ]
    st.dataframe(pd.DataFrame(type_rows), use_container_width=True, hide_index=True)

    st.divider()
    st.page_link(
        "pages/02_quality.py",
        label="次へ：データ品質診断で欠損・外れ値を確認する",
        icon="🔍",
    )
else:
    st.info("ファイルをアップロードするか、サンプルデータを選択してください。")

common.render_footer()
