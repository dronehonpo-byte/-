"""③ 群の違いを調べる（仮説検定の自動選択）。

手法名を知らなくても、目的を選ぶだけで最適な検定が自動で選ばれる教育的ページ。
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

st.title("群の違いを調べる")
st.markdown(
    "手法名を知らなくても大丈夫。目的を選ぶだけで最適な検定が自動で選ばれます。"
)

# ---- スタイル付きの理由ボックス ----
st.markdown(
    """
    <style>
    .reason-box {
        background: #EEF6FF;
        border-left: 5px solid #2E7BE4;
        border-radius: 8px;
        padding: 0.9rem 1.1rem;
        margin: 0.6rem 0 1.1rem 0;
        line-height: 1.6;
        color: #234;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def _show_assumptions(res) -> None:
    """前提条件チェックの表示。"""
    assumptions = res.assumptions or {}
    if not assumptions:
        return
    st.subheader("前提条件チェック")

    # 数値比較：正規性
    normality = assumptions.get("normality")
    if isinstance(normality, dict):
        rows = []
        for label, info in normality.items():
            rows.append(
                {
                    "群": str(label),
                    "検定": info.get("test", "Shapiro-Wilk"),
                    "p値": common.fmt_p(info.get("p")),
                    "正規性": "○" if info.get("normal") else "×",
                    "備考": info.get("note", ""),
                }
            )
        st.markdown("**正規性（Shapiro-Wilk 検定）**")
        st.caption("p > α なら『正規分布とみなせる（○）』と判断します。")
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # 数値比較：等分散
    eqvar = assumptions.get("equal_variance")
    if isinstance(eqvar, dict):
        st.markdown("**等分散性（Levene 検定）**")
        st.caption("p > α なら『等分散とみなせる（○）』と判断します。")
        st.dataframe(
            pd.DataFrame(
                [
                    {
                        "検定": eqvar.get("test", "Levene"),
                        "p値": common.fmt_p(eqvar.get("p")),
                        "等分散": "○" if eqvar.get("equal") else "×",
                        "備考": eqvar.get("note", ""),
                    }
                ]
            ),
            use_container_width=True,
            hide_index=True,
        )

    # カテゴリ：最小期待度数
    if "min_expected_freq" in assumptions:
        st.markdown("**期待度数のチェック**")
        st.caption("すべてのセルで期待度数が5以上だとカイ二乗検定が安心して使えます。")
        st.dataframe(
            pd.DataFrame(
                [
                    {
                        "最小期待度数": common.fmt_num(
                            assumptions.get("min_expected_freq")
                        ),
                        "表のサイズ": " × ".join(
                            str(s) for s in assumptions.get("table_shape", ("", ""))
                        ),
                        "5以上か": "○"
                        if assumptions.get("min_expected_freq", 0) >= 5
                        else "×",
                    }
                ]
            ),
            use_container_width=True,
            hide_index=True,
        )


def _show_result(res, alpha: float) -> None:
    """検定結果の共通表示。"""
    # 検定名を目立たせる
    st.subheader("結果")
    st.markdown(f"### 選ばれた検定：{res.test_name}")

    # 教育的な理由（必須・絶対に省略しない）
    st.markdown(
        f"<div class='reason-box'><b>なぜこの検定？</b><br>{res.reason}</div>",
        unsafe_allow_html=True,
    )

    # 前提条件チェック
    _show_assumptions(res)

    # 検定統計量・自由度・p値
    st.subheader("検定統計量と p 値")
    if isinstance(res.dof, (tuple, list)):
        dof_str = ", ".join(str(d) for d in res.dof)
    elif res.dof is None:
        dof_str = "—"
    else:
        dof_str = str(res.dof)
    cols = st.columns(3)
    cols[0].metric("検定統計量", common.fmt_num(res.statistic))
    cols[1].metric("自由度 (df)", dof_str)
    cols[2].metric(
        "p 値", f"{common.fmt_p(res.pvalue)} {common.stars(res.pvalue)}"
    )
    if res.pvalue is not None and not np.isnan(res.pvalue):
        if res.pvalue < alpha:
            st.success(f"p < α（={alpha}）なので、統計的に有意な差があります。")
        else:
            st.info(f"p ≥ α（={alpha}）なので、有意な差は認められませんでした。")

    # 効果量
    eff = res.effect
    if eff is not None:
        st.subheader("効果量（差の大きさ）")
        ci_str = "—"
        if not (np.isnan(eff.ci_low) or np.isnan(eff.ci_high)):
            ci_str = f"[{common.fmt_num(eff.ci_low)}, {common.fmt_num(eff.ci_high)}]"
        ecols = st.columns(3)
        ecols[0].metric(eff.name, common.fmt_num(eff.value))
        ecols[1].metric("95% 信頼区間", ci_str)
        ecols[2].metric("解釈", eff.interpretation)
        if eff.comment:
            st.caption(eff.comment)

    # 多重比較
    if res.posthoc is not None:
        st.subheader("多重比較（どの群とどの群が違うか）")
        st.dataframe(res.posthoc, use_container_width=True, hide_index=True)


def _summary_table(res, value_col=None, group_col=None) -> pd.DataFrame:
    """結果サマリ表を組み立てる（エクスポート用）。"""
    eff = res.effect
    if isinstance(res.dof, (tuple, list)):
        dof_str = ", ".join(str(d) for d in res.dof)
    elif res.dof is None:
        dof_str = "—"
    else:
        dof_str = str(res.dof)
    row = {
        "検定": res.test_name,
        "検定統計量": common.fmt_num(res.statistic),
        "自由度": dof_str,
        "p値": common.fmt_p(res.pvalue),
        "有意性": common.stars(res.pvalue),
    }
    if eff is not None:
        row["効果量の名称"] = eff.name
        row["効果量"] = common.fmt_num(eff.value)
        row["効果量の解釈"] = eff.interpretation
    if value_col is not None:
        row["比較した数値"] = value_col
    if group_col is not None:
        row["グループ列"] = group_col
    return pd.DataFrame([row]).T.reset_index().rename(
        columns={"index": "項目", 0: "値"}
    )


def _download_buttons(summary_df: pd.DataFrame, key_prefix: str) -> None:
    """Excel / Word / PDF のダウンロードボタン群。"""
    st.subheader("結果のダウンロード")
    tables = {"検定結果": summary_df}
    dcols = st.columns(3)
    try:
        with dcols[0]:
            st.download_button(
                "Excel (.xlsx)",
                data=excel_exporter.export_tables(tables),
                file_name="検定結果.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                key=f"{key_prefix}_xlsx",
            )
        with dcols[1]:
            st.download_button(
                "Word (.docx)",
                data=word_exporter.export_report(tables, heading="検定結果"),
                file_name="検定結果.docx",
                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                key=f"{key_prefix}_docx",
            )
        with dcols[2]:
            st.download_button(
                "PDF (.pdf)",
                data=pdf_exporter.export_report(tables, heading="検定結果"),
                file_name="検定結果.pdf",
                mime="application/pdf",
                key=f"{key_prefix}_pdf",
            )
    except Exception as e:  # noqa: BLE001
        st.error(f"ダウンロードファイルの作成に失敗しました：{e}")


def _figure_downloads(fig, key_prefix: str) -> None:
    """図の PNG / SVG ダウンロード。"""
    fcols = st.columns(2)
    try:
        with fcols[0]:
            st.download_button(
                "図を PNG で保存",
                data=visualizer.fig_to_bytes(fig, fmt="png"),
                file_name="図.png",
                mime="image/png",
                key=f"{key_prefix}_png",
            )
        with fcols[1]:
            st.download_button(
                "図を SVG で保存",
                data=visualizer.fig_to_bytes(fig, fmt="svg"),
                file_name="図.svg",
                mime="image/svg+xml",
                key=f"{key_prefix}_svg",
            )
    except Exception as e:  # noqa: BLE001
        st.error(f"図の保存に失敗しました：{e}")


# ============ 目的の選択 ============
st.divider()
purpose = st.radio(
    "何を調べたいですか？（目的を選んでください）",
    [
        "2群以上の数値を比較したい（例：介入群と対照群のスコア差）",
        "2つのカテゴリの関連を調べたい（クロス集計）",
    ],
)

numeric_cols = data_loader.numeric_columns(df)
categorical_cols = data_loader.categorical_columns(df)

# ============ 数値比較パス ============
if purpose.startswith("2群以上の数値"):
    if not numeric_cols:
        st.warning("数値の列が見つかりません。数値データを含むファイルをお使いください。")
    elif not categorical_cols:
        st.warning("グループ分けに使えるカテゴリ列が見つかりません。")
    else:
        value_col = st.selectbox("比較したい数値", numeric_cols, key="num_value_col")
        group_col = st.selectbox(
            "グループ分けの列", categorical_cols, key="num_group_col"
        )
        paired = st.checkbox(
            "対応あり（同じ対象の前後比較など）", value=False, key="num_paired"
        )
        use_bootstrap = st.checkbox(
            "ブートストラップ信頼区間を使う", value=False, key="num_bootstrap"
        )
        alpha = st.slider(
            "有意水準 α", min_value=0.001, max_value=0.10, value=0.05, step=0.001,
            key="num_alpha",
        )

        if st.button("検定を実行", type="primary", key="num_run"):
            try:
                res = hypothesis_test.compare_groups(
                    df,
                    value_col,
                    group_col,
                    paired=paired,
                    alpha=alpha,
                    use_bootstrap=use_bootstrap,
                )
                st.session_state["hyp_num_res"] = res
                st.session_state["hyp_num_meta"] = (value_col, group_col, alpha)
            except Exception as e:  # noqa: BLE001
                st.error(f"検定を実行できませんでした：{e}")

        res = st.session_state.get("hyp_num_res")
        meta = st.session_state.get("hyp_num_meta")
        if res is not None and meta is not None:
            value_col, group_col, alpha = meta
            _show_result(res, alpha)

            # 図：箱ひげ図
            st.subheader("グラフで確認（箱ひげ図）")
            try:
                fig = visualizer.boxplot(df, value_col, group_col)
                st.pyplot(fig)
                _figure_downloads(fig, "num_box")
            except Exception as e:  # noqa: BLE001
                st.error(f"図の描画に失敗しました：{e}")

            # ダウンロード
            _download_buttons(
                _summary_table(res, value_col, group_col), "num_dl"
            )

# ============ カテゴリ関連パス ============
else:
    if len(categorical_cols) < 2:
        st.warning("カテゴリの列が2つ以上必要です。")
    else:
        col1 = st.selectbox("1つ目のカテゴリ列", categorical_cols, key="cat_col1")
        col2 = st.selectbox(
            "2つ目のカテゴリ列",
            categorical_cols,
            index=1 if len(categorical_cols) > 1 else 0,
            key="cat_col2",
        )
        alpha = st.slider(
            "有意水準 α", min_value=0.001, max_value=0.10, value=0.05, step=0.001,
            key="cat_alpha",
        )

        if st.button("検定を実行", type="primary", key="cat_run"):
            if col1 == col2:
                st.error("異なる2つの列を選んでください。")
            else:
                try:
                    res = hypothesis_test.categorical_test(df, col1, col2, alpha)
                    st.session_state["hyp_cat_res"] = res
                    st.session_state["hyp_cat_meta"] = (col1, col2, alpha)
                except Exception as e:  # noqa: BLE001
                    st.error(f"検定を実行できませんでした：{e}")

        res = st.session_state.get("hyp_cat_res")
        meta = st.session_state.get("hyp_cat_meta")
        if res is not None and meta is not None:
            col1, col2, alpha = meta
            _show_result(res, alpha)

            # クロス集計表と期待度数
            extra = res.extra or {}
            if "crosstab" in extra:
                st.subheader("クロス集計表（観測度数）")
                st.dataframe(extra["crosstab"], use_container_width=True)
            if "expected" in extra:
                st.subheader("期待度数")
                st.caption("各セルが独立だった場合に期待される度数です。")
                st.dataframe(
                    extra["expected"].round(2), use_container_width=True
                )

            _download_buttons(_summary_table(res, col1, col2), "cat_dl")

common.render_footer()
