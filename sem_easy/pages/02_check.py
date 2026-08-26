"""② 入力検査・尺度の確認と推定法の推奨。"""
from __future__ import annotations

import pandas as pd
import streamlit as st

from modules import auth, common, data_loader, scales

user_id = auth.require_login()
load = common.require_data(user_id)

st.title("② 入力検査・尺度の確認")

if load.kind != data_loader.INDIVIDUAL:
    st.info(
        "行列入力のため、尺度の判定は行いません。"
        "行列は欠損処理済みであることを前提とします。"
    )
    st.dataframe(load.data, use_container_width=True)
    st.page_link("pages/03_model.py", label="➡ ③ モデル作成へ", icon="🧩")
    common.render_footer()
    st.stop()

df = load.data

st.markdown(
    "Excel 上で数値になっていても、すべてが連続尺度とは限りません。"
    "たとえば 1〜5 の選択肢から回答する項目は **順序尺度** として扱う場合があります。"
    "**自動判定は初期値です。必要に応じて変更してください。**"
)

detected = scales.detect_all(df)
saved = common.get_state(user_id, "scales")

st.subheader("変数ごとの尺度")
edit = detected.copy()
if saved:
    edit["推定された尺度"] = [saved.get(v, k) for v, k in
                              zip(edit["変数"], edit["推定された尺度"])]
edit = edit.rename(columns={"推定された尺度": "尺度（変更できます）"})

edited = st.data_editor(
    edit,
    column_config={
        "尺度（変更できます）": st.column_config.SelectboxColumn(
            options=[scales.CONTINUOUS, scales.ORDINAL, scales.BINARY, scales.UNUSABLE],
            required=True,
        ),
    },
    disabled=["変数", "水準数", "最小", "最大", "欠損数", "欠損率(%)"],
    hide_index=True,
    use_container_width=True,
    key="scale_editor",
)

scale_map = dict(zip(edited["変数"], edited["尺度（変更できます）"]))
common.set_state(user_id, "scales", scale_map)

unusable = [v for v, k in scale_map.items() if k == scales.UNUSABLE]
if unusable:
    st.warning(
        f"次の変数は分析に使えません（値が1種類しかない等）：{', '.join(unusable)}。"
        "モデルには含めないでください。"
    )

# ---- 推定法の推奨（理由つき）----
st.divider()
st.subheader("推定法の推奨")

usable = {v: k for v, k in scale_map.items() if k != scales.UNUSABLE}
has_missing = bool(df[list(usable.keys())].isna().any().any()) if usable else False
rec = scales.recommend(usable, has_missing)

st.success(f"**推奨：{scales.ESTIMATORS[rec['estimator']]['label']}**")
st.markdown(f"**なぜこの方法を勧めるのか**：{rec['reason']}")

combos = scales.valid_combinations()
labels = [f"{c['estimator_label']} ／ {c['missing_label']}" for c in combos]
default_idx = next(
    (i for i, c in enumerate(combos)
     if c["estimator"] == rec["estimator"] and c["missing"] == rec["missing"]), 0
)
chosen = st.selectbox(
    "推定法と欠損値の扱い（使えない組合せは表示されません）",
    range(len(combos)), format_func=lambda i: labels[i], index=default_idx,
)
sel = combos[chosen]
common.set_state(user_id, "estimator", sel["estimator"])
common.set_state(user_id, "missing", sel["missing"])
st.caption(
    f"選択中：{sel['estimator_label']} ／ {sel['missing_label']}　"
    f"— {scales.explain_estimator(sel['estimator'])}"
)

if has_missing:
    miss_tbl = detected[detected["欠損数"] > 0][["変数", "欠損数", "欠損率(%)"]]
    if len(miss_tbl):
        st.markdown("**欠損値のある変数**")
        st.dataframe(miss_tbl, use_container_width=True, hide_index=True)

st.page_link("pages/03_model.py", label="➡ ③ モデル作成へ", icon="🧩")
common.render_footer()
