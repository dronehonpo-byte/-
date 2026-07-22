"""② データ品質診断ページ。

読み込み済みデータに対し、欠損値・外れ値・重複行などの品質を自動診断する。
"""
from __future__ import annotations

import streamlit as st

from modules import common, data_loader, data_quality, descriptive_stats, visualizer

common.require_password()  # 全ページでパスワード必須（直接アクセス時も保護）

df = common.require_data()

st.title("🔍 データ品質診断")
st.markdown(
    "読み込んだデータの品質を自動で点検します。"
    "欠損値・外れ値候補・重複行をチェックし、解析前に注意すべき点を確認しましょう。"
)

# ---- サイドバー：診断パラメータ ----
st.sidebar.header("診断設定")
iqr_k = st.sidebar.slider(
    "IQR係数",
    min_value=0.5,
    max_value=3.0,
    value=1.5,
    step=0.1,
    help="四分位範囲（IQR）の何倍を外れ値の境界とするか。一般的には1.5。",
)
z_thresh = st.sidebar.slider(
    "Zスコア閾値",
    min_value=1.0,
    max_value=5.0,
    value=3.0,
    step=0.1,
    help="標準化得点（Zスコア）の絶対値がこの値を超える点を外れ値候補とする。一般的には3.0。",
)

column_types = st.session_state.get("column_types")

# ---- 診断実行 ----
try:
    report = data_quality.diagnose(
        df, column_types=column_types, iqr_k=iqr_k, z_thresh=z_thresh
    )
except Exception as e:  # noqa: BLE001
    st.error(f"品質診断中にエラーが発生しました: {e}")
    common.render_footer()
    st.stop()

# ---- データ形状サマリー ----
st.subheader("データ概要")
c1, c2, c3 = st.columns(3)
c1.metric("行数", f"{report.shape[0]:,}")
c2.metric("列数", f"{report.shape[1]:,}")
c3.metric("有効サンプルサイズ", f"{report.valid_n:,}", help="欠損のない完全な行の数")

# ---- 欠損値レポート ----
st.subheader("欠損値レポート")

missing = report.missing.copy()

_emoji = {"ok": "🟢", "warn": "🟡", "bad": "🔴"}
missing["状態"] = missing["列名"].map(
    lambda c: _emoji.get(report.severity.get(c, "ok"), "🟢")
)


def _row_color(row):
    sev = report.severity.get(row["列名"], "ok")
    bg = {"ok": "#e6f4ea", "warn": "#fff7e0", "bad": "#fde7e7"}.get(sev, "")
    return [f"background-color: {bg}"] * len(row)


try:
    styled = missing.style.apply(_row_color, axis=1)
    st.dataframe(styled, use_container_width=True)
except Exception:  # noqa: BLE001 — スタイル適用失敗時は素のまま表示
    st.dataframe(missing, use_container_width=True)

st.caption("状態の凡例： 🟢 欠損率10%以下 ／ 🟡 10%超 ／ 🔴 50%超")

# 50%超の警告
if report.high_missing_cols:
    st.warning(
        "次の列は欠損率が50%を超えています： "
        + "、".join(map(str, report.high_missing_cols))
        + " 。これらの変数を解析に用いるべきか再検討してください。"
    )

# ---- 欠損ヒント（最も欠損率の高い列について）----
st.sidebar.markdown("---")
st.sidebar.subheader("欠損対処ヒント")
if len(missing) and missing["欠損率(%)"].max() > 0:
    idx = missing["欠損率(%)"].idxmax()
    top_col = missing.loc[idx, "列名"]
    top_rate = float(missing.loc[idx, "欠損率(%)"])
    st.sidebar.markdown(f"**最大欠損列：** {top_col}（{top_rate:.1f}%）")
    st.sidebar.info(data_quality.missing_hint(top_rate))
else:
    st.sidebar.success("欠損はありません。")

# ---- 欠損ヒートマップ ----
st.subheader("欠損値ヒートマップ")
try:
    fig = visualizer.missing_heatmap(df)
    st.pyplot(fig)
    png_bytes = visualizer.fig_to_bytes(fig, fmt="png")
    svg_bytes = visualizer.fig_to_bytes(fig, fmt="svg")
    d1, d2 = st.columns(2)
    d1.download_button(
        "PNG をダウンロード",
        data=png_bytes,
        file_name="missing_heatmap.png",
        mime="image/png",
        key="dl_missing_png",
    )
    d2.download_button(
        "SVG をダウンロード",
        data=svg_bytes,
        file_name="missing_heatmap.svg",
        mime="image/svg+xml",
        key="dl_missing_svg",
    )
except Exception as e:  # noqa: BLE001
    st.error(f"ヒートマップの作成に失敗しました: {e}")

# ---- 外れ値レポート ----
st.subheader("外れ値候補レポート")
st.caption(
    f"IQR係数 = {iqr_k}、Zスコア閾値 = {z_thresh} に基づく数値列の外れ値候補件数です。"
)
if len(report.outliers):
    st.dataframe(report.outliers, use_container_width=True)
else:
    st.info("数値列が無いため外れ値の判定は行えませんでした。")

# ---- 重複行 ----
st.subheader("重複行")
st.metric("重複行数", f"{report.n_duplicates:,}")
if report.n_duplicates > 0:
    st.write("重複している行（最初の出現を除く）：")
    st.dataframe(report.duplicate_rows, use_container_width=True)
else:
    st.success("完全に重複した行はありません。")

common.render_footer()
