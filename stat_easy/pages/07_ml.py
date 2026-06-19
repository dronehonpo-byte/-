"""⑥ 予測モデルを作る（機械学習モデルの自動比較）ページ。

目的変数の型から分類/回帰を自動判定し、複数モデルを k 分割交差検証で比較する。
"""
from __future__ import annotations

import streamlit as st
import pandas as pd

from modules import common, data_loader, ml_compare, clustering, visualizer
from exporters import excel_exporter, pdf_exporter

df = common.require_data()

st.title("🤖 予測モデルを作る")
st.markdown(
    "選んだ目的変数を予測するモデルを自動で作成・比較します。"
    "目的変数の型から **分類**（カテゴリの予測）か **回帰**（数値の予測）かを自動で判定し、"
    "ランダムフォレストやロジスティック回帰などの複数モデルを "
    "**k 分割交差検証** で公平に評価して、最も成績の良いモデルを提示します。"
)
st.caption("計算は scikit-learn / xgboost のみで行います（生成 AI は使用しません）。")

# ---- 目的変数 ----
target = st.selectbox("目的変数（予測したい列）", df.columns.tolist())

mode = ml_compare.detect_mode(df[target])
mode_label = "分類" if mode == "classification" else "回帰"
st.info(f"判定された分析タイプ： **{mode_label}**")

# ---- 特徴量 ----
numeric_cols = [c for c in data_loader.numeric_columns(df) if c != target]
features = st.multiselect(
    "特徴量（予測に使う数値列）",
    numeric_cols,
    default=numeric_cols,
    help="目的変数を予測するために使う説明変数を選びます。",
)

# ---- 交差検証の分割数 ----
k = st.slider("交差検証の分割数 (k)", min_value=2, max_value=10, value=5,
              help="データを k 個に分けて、k 回の学習・検証を繰り返して平均的な性能を測ります。")

# ---- 実行 ----
if st.button("モデルを比較", type="primary"):
    if not features:
        st.error("特徴量を1つ以上選んでください。")
    else:
        try:
            with st.spinner("モデルを学習・比較しています…"):
                result = ml_compare.compare(df, target, features, k)
            st.session_state["ml_result"] = result
        except Exception as e:  # noqa: BLE001
            st.error(f"モデル比較中にエラーが発生しました: {e}")

result = st.session_state.get("ml_result")

if result is not None and result.target == target:
    # ---- 警告 ----
    for w in result.warnings:
        st.warning(w)

    # ---- 比較表 ----
    st.subheader("モデル比較結果")
    st.caption("成績の良い順に並んでいます（上が最優秀）。")
    st.dataframe(result.comparison, use_container_width=True)
    st.success(f"最優秀モデル: {result.best_model_name}")

    # ---- 特徴量重要度 ----
    if result.feature_importance is not None:
        st.subheader("特徴量重要度")
        st.caption("予測にどの特徴量が効いているかを示します（最優秀モデルに基づく）。")
        try:
            fig_fi = visualizer.feature_importance_plot(result.feature_importance)
            st.pyplot(fig_fi)
            c1, c2 = st.columns(2)
            c1.download_button(
                "PNG をダウンロード",
                data=visualizer.fig_to_bytes(fig_fi, fmt="png"),
                file_name="feature_importance.png",
                mime="image/png",
                key="dl_fi_png",
            )
            c2.download_button(
                "SVG をダウンロード",
                data=visualizer.fig_to_bytes(fig_fi, fmt="svg"),
                file_name="feature_importance.svg",
                mime="image/svg+xml",
                key="dl_fi_svg",
            )
        except Exception as e:  # noqa: BLE001
            st.error(f"特徴量重要度の作図に失敗しました: {e}")
        st.dataframe(result.feature_importance, use_container_width=True)

    # ---- ROC 曲線（2値分類のみ）----
    if result.roc_data:
        st.subheader("ROC 曲線")
        st.caption("2値分類における各モデルの判別性能（曲線が左上に寄るほど良い）。")
        try:
            fig_roc = visualizer.roc_curve_plot(result.roc_data)
            st.pyplot(fig_roc)
            c1, c2 = st.columns(2)
            c1.download_button(
                "PNG をダウンロード",
                data=visualizer.fig_to_bytes(fig_roc, fmt="png"),
                file_name="roc_curve.png",
                mime="image/png",
                key="dl_roc_png",
            )
            c2.download_button(
                "SVG をダウンロード",
                data=visualizer.fig_to_bytes(fig_roc, fmt="svg"),
                file_name="roc_curve.svg",
                mime="image/svg+xml",
                key="dl_roc_svg",
            )
        except Exception as e:  # noqa: BLE001
            st.error(f"ROC 曲線の作図に失敗しました: {e}")

    # ---- 表のエクスポート ----
    st.subheader("レポート出力")
    tables = {"モデル比較": result.comparison}
    if result.feature_importance is not None:
        tables["特徴量重要度"] = result.feature_importance
    c1, c2 = st.columns(2)
    try:
        c1.download_button(
            "Excel をダウンロード",
            data=excel_exporter.export_tables(tables),
            file_name="ml_comparison.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            key="dl_ml_xlsx",
        )
    except Exception as e:  # noqa: BLE001
        c1.error(f"Excel 出力に失敗しました: {e}")
    try:
        c2.download_button(
            "PDF をダウンロード",
            data=pdf_exporter.export_report(tables, heading="StatEasy 予測モデル比較レポート"),
            file_name="ml_comparison.pdf",
            mime="application/pdf",
            key="dl_ml_pdf",
        )
    except Exception as e:  # noqa: BLE001
        c2.error(f"PDF 出力に失敗しました: {e}")

common.render_footer()
