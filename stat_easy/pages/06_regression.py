"""⑥ 変数間の関係を調べる（相関・回帰）。

相関分析、線形回帰、ロジスティック回帰、変数変換による比較を行う。
"""
from __future__ import annotations

import streamlit as st
import pandas as pd

from modules import common, data_loader, correlation, visualizer
from exporters import excel_exporter, word_exporter, pdf_exporter

df = common.require_data()

st.title("🔗 変数間の関係を調べる")
st.markdown(
    "相関分析・線形回帰・ロジスティック回帰・変数変換を通じて、"
    "変数どうしの関係を統計的に調べます。"
)

numeric_cols = data_loader.numeric_columns(df)
cat_cols = data_loader.categorical_columns(df)

tab_corr, tab_lin, tab_logit, tab_trans = st.tabs(
    ["相関分析", "線形回帰", "ロジスティック回帰", "変数変換"]
)


def _fmt_p_table(table: pd.DataFrame, p_col: str = "p値") -> pd.DataFrame:
    """表示用に p 値列を APA 形式へ整形したコピーを返す。"""
    disp = table.copy()
    if p_col in disp.columns:
        disp[p_col] = disp[p_col].map(common.fmt_p)
    return disp


def _table_download_buttons(tables: dict, images, key_prefix: str,
                            heading: str = "StatEasy 解析レポート"):
    """主要表を Excel / Word / PDF でダウンロードできるボタン群を出す。"""
    c1, c2, c3 = st.columns(3)
    try:
        xlsx = excel_exporter.export_tables(tables)
        c1.download_button(
            "Excel をダウンロード", data=xlsx,
            file_name=f"{key_prefix}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            key=f"dl_{key_prefix}_xlsx",
        )
    except Exception as e:  # noqa: BLE001
        c1.error(f"Excel 出力に失敗: {e}")
    try:
        docx = word_exporter.export_report(tables, images=images, heading=heading)
        c2.download_button(
            "Word をダウンロード", data=docx,
            file_name=f"{key_prefix}.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            key=f"dl_{key_prefix}_docx",
        )
    except Exception as e:  # noqa: BLE001
        c2.error(f"Word 出力に失敗: {e}")
    try:
        pdf = pdf_exporter.export_report(tables, images=images, heading=heading)
        c3.download_button(
            "PDF をダウンロード", data=pdf,
            file_name=f"{key_prefix}.pdf",
            mime="application/pdf",
            key=f"dl_{key_prefix}_pdf",
        )
    except Exception as e:  # noqa: BLE001
        c3.error(f"PDF 出力に失敗: {e}")


def _fig_download_buttons(fig, key_prefix: str):
    """図の PNG / SVG ダウンロードボタンを出す。"""
    png = visualizer.fig_to_bytes(fig, fmt="png")
    svg = visualizer.fig_to_bytes(fig, fmt="svg")
    d1, d2 = st.columns(2)
    d1.download_button(
        "PNG をダウンロード", data=png, file_name=f"{key_prefix}.png",
        mime="image/png", key=f"dl_{key_prefix}_png",
    )
    d2.download_button(
        "SVG をダウンロード", data=svg, file_name=f"{key_prefix}.svg",
        mime="image/svg+xml", key=f"dl_{key_prefix}_svg",
    )


# =========================== 相関分析 ===========================
with tab_corr:
    st.subheader("相関分析")
    if len(numeric_cols) < 2:
        st.info("相関分析には数値列が 2 つ以上必要です。")
    else:
        method_label = st.radio(
            "相関係数の種類",
            ["Pearson（ピアソン）", "Spearman（スピアマン）", "Kendall（ケンドール）"],
            horizontal=True,
            help="Pearson は線形関係、Spearman / Kendall は順位に基づく単調関係を測ります。",
            key="corr_method",
        )
        method = {
            "Pearson（ピアソン）": "pearson",
            "Spearman（スピアマン）": "spearman",
            "Kendall（ケンドール）": "kendall",
        }[method_label]

        cols = st.multiselect(
            "対象とする数値列", numeric_cols, default=numeric_cols, key="corr_cols"
        )
        if len(cols) < 2:
            st.info("2 つ以上の列を選択してください。")
        else:
            try:
                corr, pvals = correlation.correlation_matrix(df, method, cols)
            except Exception as e:  # noqa: BLE001
                st.error(f"相関の計算に失敗しました: {e}")
            else:
                st.markdown("**相関係数行列**")
                st.dataframe(corr.round(3), use_container_width=True)

                st.markdown("**p 値行列**")
                st.dataframe(
                    pvals.map(common.fmt_p), use_container_width=True
                )

                st.markdown("**相関ヒートマップ**")
                fig = visualizer.correlation_heatmap(corr)
                st.pyplot(fig)
                _fig_download_buttons(fig, "correlation_heatmap")


# =========================== 線形回帰 ===========================
with tab_lin:
    st.subheader("線形回帰")
    if len(numeric_cols) < 2:
        st.info("線形回帰には数値列が 2 つ以上必要です。")
    else:
        y_col = st.selectbox("目的変数 y（数値）", numeric_cols, key="lin_y")
        x_candidates = [c for c in numeric_cols if c != y_col]
        x_cols = st.multiselect(
            "説明変数 x（数値・複数可）", x_candidates,
            default=x_candidates[:1], key="lin_x",
        )

        if st.button("線形回帰を実行", key="run_lin"):
            if not x_cols:
                st.warning("説明変数を 1 つ以上選択してください。")
            else:
                try:
                    res = correlation.linear_regression(df, y_col, x_cols)
                except Exception as e:  # noqa: BLE001
                    st.error(f"線形回帰に失敗しました: {e}")
                else:
                    st.markdown("**回帰係数**")
                    st.dataframe(
                        _fmt_p_table(res.summary_table), use_container_width=True
                    )

                    st.markdown("**モデル適合度**")
                    fit_disp = {
                        k: (common.fmt_p(v) if "p値" in k else v)
                        for k, v in res.fit_stats.items()
                    }
                    fit_df = pd.DataFrame(
                        list(fit_disp.items()), columns=["指標", "値"]
                    )
                    st.dataframe(fit_df, use_container_width=True)

                    if res.vif is not None:
                        st.markdown("**VIF（多重共線性）**")
                        st.dataframe(res.vif, use_container_width=True)
                    for w in res.warnings:
                        st.warning(w)

                    st.markdown("**残差診断**")
                    fig = visualizer.residual_plots(
                        res.diagnostics["fitted"], res.diagnostics["residuals"]
                    )
                    st.pyplot(fig)
                    st.caption(
                        f"Durbin-Watson 統計量 = {res.diagnostics['durbin_watson']}"
                        "（2 前後なら残差の独立性に問題は少ない）"
                    )

                    png = visualizer.fig_to_bytes(fig, fmt="png")
                    st.markdown("**結果のダウンロード**")
                    _table_download_buttons(
                        {"回帰係数": res.summary_table, "モデル適合度": fit_df},
                        images=[("残差診断プロット", png)],
                        key_prefix="linear_regression",
                        heading="線形回帰 解析レポート",
                    )


# ====================== ロジスティック回帰 ======================
with tab_logit:
    st.subheader("ロジスティック回帰")
    if not cat_cols or not numeric_cols:
        st.info("ロジスティック回帰には 2 値のカテゴリ列と数値の説明変数が必要です。")
    else:
        y_col = st.selectbox(
            "目的変数 y（2 値カテゴリ）", cat_cols, key="logit_y",
            help="水準が 2 つのカテゴリ列を選んでください。",
        )
        x_cols = st.multiselect(
            "説明変数 x（数値・複数可）", numeric_cols,
            default=numeric_cols[:1], key="logit_x",
        )

        if st.button("ロジスティック回帰を実行", key="run_logit"):
            if not x_cols:
                st.warning("説明変数を 1 つ以上選択してください。")
            else:
                try:
                    res = correlation.logistic_regression(df, y_col, x_cols)
                except Exception as e:  # noqa: BLE001
                    st.error(f"ロジスティック回帰に失敗しました: {e}")
                else:
                    st.markdown("**回帰係数（オッズ比）**")
                    st.dataframe(
                        _fmt_p_table(res.summary_table), use_container_width=True
                    )

                    st.markdown("**モデル適合度**")
                    fit_df = pd.DataFrame(
                        list(res.fit_stats.items()), columns=["指標", "値"]
                    )
                    st.dataframe(fit_df, use_container_width=True)

                    st.markdown("**ROC 曲線**")
                    fpr, tpr = res.diagnostics["roc"]
                    auc = res.diagnostics["auc"]
                    roc_data = {"モデル": (fpr, tpr, auc)}
                    fig = visualizer.roc_curve_plot(roc_data)
                    st.pyplot(fig)
                    _fig_download_buttons(fig, "roc_curve")

                    st.markdown("**混同行列**")
                    classes = res.diagnostics["classes"]
                    cm = res.diagnostics["confusion_matrix"]
                    cm_df = pd.DataFrame(
                        cm,
                        index=[f"実測: {c}" for c in classes],
                        columns=[f"予測: {c}" for c in classes],
                    )
                    st.dataframe(cm_df, use_container_width=True)

                    st.markdown("**Hosmer-Lemeshow 適合度検定**")
                    hl = res.diagnostics["hosmer_lemeshow"]
                    st.write(
                        f"統計量 = {hl['statistic']}、自由度 = {hl['dof']}、"
                        f"p = {common.fmt_p(hl['p'])}"
                    )
                    st.caption("p が大きい（>0.05）ほどモデルの当てはまりは良好です。")

                    png = visualizer.fig_to_bytes(fig, fmt="png")
                    st.markdown("**結果のダウンロード**")
                    _table_download_buttons(
                        {
                            "回帰係数": res.summary_table,
                            "モデル適合度": fit_df,
                            "混同行列": cm_df.reset_index().rename(
                                columns={"index": ""}
                            ),
                        },
                        images=[("ROC 曲線", png)],
                        key_prefix="logistic_regression",
                        heading="ロジスティック回帰 解析レポート",
                    )


# =========================== 変数変換 ===========================
with tab_trans:
    st.subheader("変数変換とモデル比較")
    st.markdown(
        "説明変数に変換（対数・二乗・平方根）を施し、元のモデルと"
        "当てはまり（AIC/BIC/R²）を比較できます。"
    )
    if len(numeric_cols) < 2:
        st.info("変数変換の比較には数値列が 2 つ以上必要です。")
    else:
        target_x = st.selectbox(
            "変換する数値列", numeric_cols, key="trans_col"
        )
        kind_labels = st.multiselect(
            "適用する変換",
            ["対数（log）", "二乗（square）", "平方根（sqrt）"],
            default=["対数（log）"],
            key="trans_kinds",
        )
        kinds = [
            {"対数（log）": "log", "二乗（square）": "square",
             "平方根（sqrt）": "sqrt"}[k]
            for k in kind_labels
        ]

        y_candidates = [c for c in numeric_cols if c != target_x]
        y_col = st.selectbox("目的変数 y（数値）", y_candidates, key="trans_y")

        if st.button("変換してモデルを比較", key="run_trans"):
            if not kinds:
                st.warning("変換を 1 つ以上選択してください。")
            else:
                try:
                    tdf = correlation.add_transformations(df, target_x, kinds)
                    models = {}
                    base = correlation.linear_regression(tdf, y_col, [target_x])
                    models["元の変数"] = base
                    name_map = {
                        "log": (f"log_{target_x}", "対数変換"),
                        "square": (f"sq_{target_x}", "二乗変換"),
                        "sqrt": (f"sqrt_{target_x}", "平方根変換"),
                    }
                    for k in kinds:
                        col_name, label = name_map[k]
                        if col_name in tdf.columns:
                            models[label] = correlation.linear_regression(
                                tdf, y_col, [col_name]
                            )
                    comp = correlation.compare_models_fit(models)
                except Exception as e:  # noqa: BLE001
                    st.error(f"変換・モデル比較に失敗しました: {e}")
                else:
                    st.markdown("**モデル比較（AIC / BIC / R²）**")
                    st.dataframe(comp, use_container_width=True)
                    st.caption("AIC・BIC は小さいほど、R² は大きいほど当てはまりが良いとされます。")
                    _table_download_buttons(
                        {"モデル比較": comp},
                        images=None,
                        key_prefix="model_comparison",
                        heading="変数変換 モデル比較レポート",
                    )


common.render_footer()
