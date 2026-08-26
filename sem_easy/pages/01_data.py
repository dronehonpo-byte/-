"""① データ読込：個票データ／相関行列／共分散行列。"""
from __future__ import annotations

import pandas as pd
import streamlit as st

from modules import auth, common, data_loader

user_id = auth.require_login()

st.title("① データ読込")
st.markdown(
    "個票データ（Excel / CSV）のほか、**相関行列・共分散行列**の読み込みにも対応しています。"
)

kind = st.radio(
    "入力方式",
    [data_loader.INDIVIDUAL, data_loader.CORRELATION, data_loader.COVARIANCE],
    horizontal=True,
    help="行列を入力する場合は、1列目に変数名、2列目以降に数値を並べ、標本数 N を指定してください。",
)

n_input = None
if kind != data_loader.INDIVIDUAL:
    n_input = st.number_input(
        "標本数 N（行列入力では必須）", min_value=2, value=300, step=1,
        help="この行列が何人分のデータから計算されたかを入力してください。",
    )

up = st.file_uploader("ファイルを選択（.csv / .xlsx）", type=["csv", "xlsx", "xls"])

if up is not None and st.button("読み込む", type="primary"):
    try:
        if kind == data_loader.INDIVIDUAL:
            res = data_loader.load_individual(up, up.name)
        else:
            res = data_loader.load_matrix(up, up.name, kind, int(n_input))
        common.set_state(user_id, "load_result", res)
        common.set_state(user_id, "scales", None)
        common.set_state(user_id, "sem_result", None)
        common.set_state(user_id, "candidates", None)
        st.success(f"『{up.name}』を読み込みました。")
    except Exception as e:  # noqa: BLE001
        st.error(f"読み込みに失敗しました：{e}")

res = common.get_state(user_id, "load_result")
if res is not None:
    st.divider()
    st.subheader("読み込み結果")
    c1, c2, c3 = st.columns(3)
    c1.metric("入力方式", res.kind)
    c2.metric("標本数 N", f"{res.n:,}")
    c3.metric("変数の数", f"{res.data.shape[1]:,}")
    if res.encoding:
        st.caption(f"検出された文字コード：{res.encoding}")

    # 標本数は「十分」と断定せず、事実のみを述べる
    st.info(data_loader.sample_size_statement(res.n))

    for p in res.problems:
        st.error(f"**要修正**：{p}")
    for nt in res.notices:
        st.warning(nt)

    st.subheader("データの先頭")
    st.dataframe(res.data.head(20), use_container_width=True)

    if not res.problems:
        st.page_link("pages/02_check.py", label="➡ ② 入力検査・尺度の確認へ", icon="🔍")
    else:
        st.stop()

common.render_footer()
