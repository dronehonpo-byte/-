"""⑨ 図表を出力する。

任意の図を生成し、PNG（300dpi・共有用）と SVG（ベクター・論文投稿用）で
ダウンロードできるギャラリーページ。
"""
from __future__ import annotations

import streamlit as st
import pandas as pd

from modules import common, data_loader, correlation, visualizer
from exporters import excel_exporter, word_exporter, pdf_exporter  # noqa: F401

df = common.require_data()

st.title("🎨 図表を出力する")
st.markdown(
    "各種の統計図を生成し、ダウンロードできます。"
    "**PNG（300dpi）は発表・共有用**、**SVG（ベクター）は論文投稿用**に適しています。"
)

numeric_cols = data_loader.numeric_columns(df)
cat_cols = data_loader.categorical_columns(df)

# ---- 言語切り替え ----
lang_label = st.radio("ラベル言語 / Label language", ["日本語", "English"],
                      horizontal=True, key="viz_lang")
lang = "ja" if lang_label == "日本語" else "en"

chart = st.selectbox(
    "図の種類",
    [
        "ヒストグラム",
        "箱ひげ図",
        "バイオリンプロット",
        "散布図+回帰直線",
        "相関ヒートマップ",
        "棒グラフ（エラーバー）",
        "欠損値ヒートマップ",
    ],
    key="viz_chart",
)

fig = None
fname = "figure"

try:
    if chart == "ヒストグラム":
        if not numeric_cols:
            st.info("数値列がありません。")
        else:
            col = st.selectbox("数値列", numeric_cols, key="hist_col")
            bins = st.slider("ビン数", 5, 100, 30, key="hist_bins")
            kde = st.checkbox("密度推定・正規分布曲線を重ねる", value=True, key="hist_kde")
            fig = visualizer.histogram(df, col, bins=bins, kde=kde, lang=lang)
            fname = f"histogram_{col}"

    elif chart == "箱ひげ図":
        if not numeric_cols:
            st.info("数値列がありません。")
        else:
            value_col = st.selectbox("数値列", numeric_cols, key="box_val")
            group_col = st.selectbox(
                "グループ列（任意）", ["（なし）"] + cat_cols, key="box_grp"
            )
            grp = None if group_col == "（なし）" else group_col
            strip = st.checkbox("各データ点を重ねる", value=True, key="box_strip")
            fig = visualizer.boxplot(df, value_col, group_col=grp, strip=strip, lang=lang)
            fname = f"boxplot_{value_col}"

    elif chart == "バイオリンプロット":
        if not numeric_cols:
            st.info("数値列がありません。")
        else:
            value_col = st.selectbox("数値列", numeric_cols, key="vln_val")
            group_col = st.selectbox(
                "グループ列（任意）", ["（なし）"] + cat_cols, key="vln_grp"
            )
            grp = None if group_col == "（なし）" else group_col
            fig = visualizer.violin(df, value_col, group_col=grp, lang=lang)
            fname = f"violin_{value_col}"

    elif chart == "散布図+回帰直線":
        if len(numeric_cols) < 2:
            st.info("散布図には数値列が 2 つ以上必要です。")
        else:
            x_col = st.selectbox("x 軸（数値）", numeric_cols, key="sct_x")
            y_candidates = [c for c in numeric_cols if c != x_col]
            y_col = st.selectbox("y 軸（数値）", y_candidates, key="sct_y")
            fig = visualizer.scatter_regression(df, x_col, y_col, lang=lang)
            fname = f"scatter_{x_col}_{y_col}"

    elif chart == "相関ヒートマップ":
        if len(numeric_cols) < 2:
            st.info("相関ヒートマップには数値列が 2 つ以上必要です。")
        else:
            cols = st.multiselect(
                "対象とする数値列", numeric_cols, default=numeric_cols, key="hm_cols"
            )
            method_label = st.radio(
                "相関係数の種類",
                ["Pearson", "Spearman", "Kendall"],
                horizontal=True, key="hm_method",
            )
            method = {"Pearson": "pearson", "Spearman": "spearman",
                      "Kendall": "kendall"}[method_label]
            if len(cols) < 2:
                st.info("2 つ以上の列を選択してください。")
            else:
                corr, _ = correlation.correlation_matrix(df, method, cols)
                fig = visualizer.correlation_heatmap(corr, lang=lang)
                fname = "correlation_heatmap"

    elif chart == "棒グラフ（エラーバー）":
        if not cat_cols or not numeric_cols:
            st.info("棒グラフにはカテゴリ列と数値列が必要です。")
        else:
            group_col = st.selectbox("グループ列（カテゴリ）", cat_cols, key="bar_grp")
            value_col = st.selectbox("数値列", numeric_cols, key="bar_val")
            fig = visualizer.bar_with_error(df, group_col, value_col, lang=lang)
            fname = f"bar_{group_col}_{value_col}"

    elif chart == "欠損値ヒートマップ":
        fig = visualizer.missing_heatmap(df, lang=lang)
        fname = "missing_heatmap"

except Exception as e:  # noqa: BLE001
    st.error(f"図の作成に失敗しました: {e}")
    fig = None

if fig is not None:
    st.pyplot(fig)
    png = visualizer.fig_to_bytes(fig, fmt="png")
    svg = visualizer.fig_to_bytes(fig, fmt="svg")
    d1, d2 = st.columns(2)
    d1.download_button(
        "PNG をダウンロード（300dpi・共有用）", data=png,
        file_name=f"{fname}.png", mime="image/png", key=f"dl_{fname}_png",
    )
    d2.download_button(
        "SVG をダウンロード（ベクター・論文投稿用）", data=svg,
        file_name=f"{fname}.svg", mime="image/svg+xml", key=f"dl_{fname}_svg",
    )
    st.caption(
        "PNG は 300dpi の高解像度ラスター画像（発表・共有向け）、"
        "SVG は拡大しても劣化しないベクター画像（論文投稿向け）です。"
    )

common.render_footer()
