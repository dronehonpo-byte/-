"""③ 記述統計・Table 1 ページ。

連続変数・カテゴリ変数の記述統計と、論文用 Table 1（APA 形式・三線表）を生成する。
"""
from __future__ import annotations

import streamlit as st

from modules import common, data_loader, data_quality, descriptive_stats, visualizer
from exporters import excel_exporter, word_exporter, pdf_exporter

df = common.require_data()

st.title("📋 記述統計・Table 1")
st.markdown(
    "データの基本的な要約統計量を確認し、論文掲載用の Table 1 を自動生成します。"
)

# ---- 記述統計（連続変数 / カテゴリ変数）----
tab_num, tab_cat, tab_t1 = st.tabs(["連続変数", "カテゴリ変数", "Table 1"])

num_table = descriptive_stats.describe_numeric(df)
cat_table = descriptive_stats.describe_categorical(df)
t1 = None

with tab_num:
    st.subheader("連続変数の記述統計")
    if len(num_table):
        st.dataframe(num_table, use_container_width=True)
    else:
        st.info("数値型の変数が見つかりませんでした。")

with tab_cat:
    st.subheader("カテゴリ変数の記述統計")
    if len(cat_table):
        st.dataframe(cat_table, use_container_width=True)
    else:
        st.info("カテゴリ型の変数が見つかりませんでした。")

# ---- Table 1 ----
with tab_t1:
    st.subheader("Table 1（APA 形式）")
    st.markdown(
        "**APA形式（三線表）について：** "
        "上辺・見出し下・下辺の3本の横罫線だけで構成する表で、縦罫線は引きません。"
        "連続変数は「平均 ± SD」、カテゴリ変数は「n (%)」で要約します。"
        "群分け変数を指定すると、群ごとの集計が並びます。"
    )

    no_group = "（群分けなし）"
    group_options = [no_group] + data_loader.categorical_columns(df)
    group_choice = st.selectbox("群分け変数", group_options, index=0)
    group_col = None if group_choice == no_group else group_choice

    try:
        t1 = descriptive_stats.table_one(df, group_col=group_col)
        st.table(t1)
    except Exception as e:  # noqa: BLE001
        st.error(f"Table 1 の生成に失敗しました: {e}")
        t1 = None

# ---- ダウンロード ----
st.markdown("---")
st.subheader("ダウンロード")
st.caption("記述統計表と Table 1 を Excel / Word / PDF 形式で出力できます。")

tables: dict = {}
if len(num_table):
    tables["連続変数_記述統計"] = num_table
if len(cat_table):
    tables["カテゴリ変数_記述統計"] = cat_table
if t1 is not None and len(t1):
    tables["Table1"] = t1

if not tables:
    st.info("出力できる表がありません。")
else:
    col_x, col_w, col_p = st.columns(3)

    with col_x:
        try:
            xlsx_bytes = excel_exporter.export_tables(tables)
            st.download_button(
                "Excel (.xlsx)",
                data=xlsx_bytes,
                file_name="stateasy_descriptive.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                key="dl_desc_xlsx",
            )
        except Exception as e:  # noqa: BLE001
            st.error(f"Excel 出力に失敗しました: {e}")

    with col_w:
        try:
            docx_bytes = word_exporter.export_report(
                tables, heading="記述統計・Table 1"
            )
            st.download_button(
                "Word (.docx)",
                data=docx_bytes,
                file_name="stateasy_descriptive.docx",
                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                key="dl_desc_docx",
            )
        except Exception as e:  # noqa: BLE001
            st.error(f"Word 出力に失敗しました: {e}")

    with col_p:
        try:
            pdf_bytes = pdf_exporter.export_report(
                tables, heading="記述統計・Table 1"
            )
            st.download_button(
                "PDF (.pdf)",
                data=pdf_bytes,
                file_name="stateasy_descriptive.pdf",
                mime="application/pdf",
                key="dl_desc_pdf",
            )
        except Exception as e:  # noqa: BLE001
            st.error(f"PDF 出力に失敗しました: {e}")

common.render_footer()
