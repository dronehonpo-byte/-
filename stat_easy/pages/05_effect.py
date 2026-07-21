"""④ 効果量・信頼区間（スタンドアロン）。

p 値だけでは『差の大きさ（実質的な意味）』はわからない。
効果量と信頼区間で、差がどれくらい大きいのかを評価する。
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import streamlit as st

from modules import common, data_loader, hypothesis_test, effect_size, visualizer
from exporters import excel_exporter, word_exporter, pdf_exporter

common.load_css()
common.setup_japanese_font()

df = common.require_data()

st.title("効果量・信頼区間")
st.markdown(
    "p 値は『差があるか（偶然か否か）』を示しますが、**差の大きさ（実質的な意味）**は教えてくれません。"
    "サンプルサイズが大きいと、ごくわずかな差でも有意になりがちです。"
    "そこで、差の大きさを表す**効果量**と、その推定の確からしさを示す**信頼区間**を確認します。"
)

# ---- 効果量の基準（参照表）----
st.subheader("効果量の大きさの目安（Cohen の基準）")
threshold_df = pd.DataFrame(
    {
        "効果量": ["Cohen's d / Hedges' g", "η²（イータ二乗）", "Cramér's V"],
        "小 (small)": ["0.2", ".01", ".1"],
        "中 (medium)": ["0.5", ".06", ".3"],
        "大 (large)": ["0.8", ".14", ".5"],
    }
)
st.dataframe(threshold_df, use_container_width=True, hide_index=True)

st.divider()

# ---- Cohen's d / Hedges' g の計算 ----
st.subheader("2群の効果量（Cohen's d / Hedges' g）を計算する")

numeric_cols = data_loader.numeric_columns(df)
categorical_cols = data_loader.categorical_columns(df)

if not numeric_cols:
    st.warning("数値の列が見つかりません。数値データを含むファイルをお使いください。")
elif not categorical_cols:
    st.warning("グループ分けに使えるカテゴリ列が見つかりません。")
else:
    value_col = st.selectbox("対象の数値", numeric_cols, key="eff_value_col")
    group_col = st.selectbox("グループ分けの列", categorical_cols, key="eff_group_col")

    levels = list(pd.Series(df[group_col].dropna().unique()))

    chosen = None
    if len(levels) < 2:
        st.warning("選んだ列にはグループが1つしかありません。2群以上の列を選んでください。")
    elif len(levels) == 2:
        chosen = levels
        st.caption(f"比較する2群：{levels[0]} と {levels[1]}")
    else:
        chosen = st.multiselect(
            "比較する2つの群を選んでください（ちょうど2つ）",
            options=[str(x) for x in levels],
            default=[str(levels[0]), str(levels[1])],
            max_selections=2,
            key="eff_levels",
        )
        if len(chosen) != 2:
            st.info("ちょうど2つの群を選んでください。")
            chosen = None

    paired = st.checkbox("対応あり（同じ対象の前後比較など）", value=False, key="eff_paired")
    use_bootstrap = st.checkbox(
        "ブートストラップ信頼区間を使う", value=False, key="eff_bootstrap"
    )

    if st.button("効果量を計算", type="primary", key="eff_run"):
        if not chosen or len(chosen) != 2:
            st.error("比較する2つの群を選んでください。")
        else:
            try:
                sub = df[[value_col, group_col]].dropna()
                sub[group_col] = sub[group_col].astype(str)
                g1, g2 = str(chosen[0]), str(chosen[1])
                a = sub.loc[sub[group_col] == g1, value_col].to_numpy(dtype=float)
                b = sub.loc[sub[group_col] == g2, value_col].to_numpy(dtype=float)
                if len(a) < 2 or len(b) < 2:
                    raise ValueError("各群に2件以上のデータが必要です。")
                res = effect_size.two_group_effect(
                    a, b, paired=paired, use_bootstrap=use_bootstrap
                )
                st.session_state["eff_res"] = res
                st.session_state["eff_meta"] = (value_col, group_col, g1, g2)
            except Exception as e:  # noqa: BLE001
                st.error(f"効果量を計算できませんでした：{e}")

    res = st.session_state.get("eff_res")
    meta = st.session_state.get("eff_meta")
    if res is not None and meta is not None:
        value_col_r, group_col_r, g1, g2 = meta
        st.subheader("結果")
        st.caption(f"{value_col_r}：『{g1}』 vs 『{g2}』")

        ci_str = "—"
        if not (np.isnan(res.ci_low) or np.isnan(res.ci_high)):
            ci_str = f"[{common.fmt_num(res.ci_low)}, {common.fmt_num(res.ci_high)}]"

        mcols = st.columns(3)
        mcols[0].metric(res.name, common.fmt_num(res.value))
        mcols[1].metric("95% 信頼区間", ci_str)
        mcols[2].metric("解釈", res.interpretation)

        if res.comment:
            st.info(res.comment)

        st.caption(
            "信頼区間が0をまたぐ場合、差が0である可能性も否定できないことを意味します。"
        )

        # サマリ表とダウンロード
        summary_df = pd.DataFrame(
            [
                {"項目": "効果量の名称", "値": res.name},
                {"項目": "効果量", "値": common.fmt_num(res.value)},
                {"項目": "95% 信頼区間", "値": ci_str},
                {"項目": "解釈", "値": res.interpretation},
                {"項目": "対象の数値", "値": value_col_r},
                {"項目": "比較した群", "値": f"{g1} vs {g2}"},
            ]
        )
        tables = {"効果量": summary_df}
        st.subheader("結果のダウンロード")
        dcols = st.columns(3)
        try:
            with dcols[0]:
                st.download_button(
                    "Excel (.xlsx)",
                    data=excel_exporter.export_tables(tables),
                    file_name="効果量.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="eff_xlsx",
                )
            with dcols[1]:
                st.download_button(
                    "Word (.docx)",
                    data=word_exporter.export_report(tables, heading="効果量"),
                    file_name="効果量.docx",
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    key="eff_docx",
                )
            with dcols[2]:
                st.download_button(
                    "PDF (.pdf)",
                    data=pdf_exporter.export_report(tables, heading="効果量"),
                    file_name="効果量.pdf",
                    mime="application/pdf",
                    key="eff_pdf",
                )
        except Exception as e:  # noqa: BLE001
            st.error(f"ダウンロードファイルの作成に失敗しました：{e}")

common.render_footer()
