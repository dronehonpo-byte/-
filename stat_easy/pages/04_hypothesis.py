"""③ グループごとの違いを調べる（仮説検定の自動選択）。

手法名を知らなくても、目的を選ぶだけで最適な検定が自動で選ばれる教育的ページ。
結果は「結論ファースト」（結論→根拠→数値→図表→注意点→ダウンロード）で提示する。
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
    "手法名を知らなくても大丈夫。目的を選ぶだけで最適な検定が自動で選ばれ、"
    "まず結論、続いてその根拠を分かりやすく表示します。"
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


def _dof_str(dof) -> str:
    if isinstance(dof, (tuple, list)):
        return ", ".join(str(d) for d in dof)
    if dof is None:
        return "—"
    return str(dof)


def _reason_box(res) -> None:
    """教育的な理由（必須・絶対に省略しない）。"""
    st.markdown(
        f"<div class='reason-box'><b>なぜこの検定？</b><br>{res.reason}</div>",
        unsafe_allow_html=True,
    )


def _show_normality(res) -> None:
    """群別の正規性・等分散・対応の有無を表示。"""
    assumptions = res.assumptions or {}
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


def _numeric_caveats(res, summary_df: pd.DataFrame) -> list[str]:
    """数値比較の注意点（caveats）を組み立てる。"""
    notes: list[str] = []
    assumptions = res.assumptions or {}

    # 小標本
    try:
        small = summary_df[summary_df["n"] < 10]
        if not small.empty:
            labels = "・".join(str(g) for g in small["グループ"].tolist())
            notes.append(
                f"サンプルサイズの小さいグループがあります（{labels}：n<10）。"
                "結果は参考程度にとどめ、慎重に解釈してください。"
            )
    except Exception:  # noqa: BLE001
        pass

    # 欠損
    try:
        miss = summary_df[summary_df["欠損数"] > 0]
        if not miss.empty:
            total_missing = int(miss["欠損数"].sum())
            notes.append(
                f"欠損値が {total_missing} 件あります。検定では欠損を除外して計算しています。"
            )
    except Exception:  # noqa: BLE001
        pass

    # 正規性が判定不能だった群
    normality = assumptions.get("normality")
    if isinstance(normality, dict):
        for label, info in normality.items():
            note = info.get("note")
            if note:
                notes.append(f"群『{label}』：{note}")

    return notes


def _show_numeric_result(res, df, value_col, group_col, alpha: float) -> None:
    """数値比較の結論ファースト表示。"""
    pvalue = res.pvalue
    significant = (
        pvalue is not None and not np.isnan(pvalue) and pvalue < alpha
    )
    diff = (res.extra or {}).get("diff") or {}
    summary_df = hypothesis_test.group_summary(df, value_col, group_col)

    # 1. 結論（最も目立たせる）
    st.header("結論")
    if significant:
        st.success("### ✅ グループ間に統計的な差が認められました")
    else:
        st.warning("### 差があるとはいえませんでした")

    plain = None
    if "mean_diff" in diff:
        md = diff["mean_diff"]
        groups = list(summary_df["グループ"]) if not summary_df.empty else []
        if len(groups) == 2:
            g0, g1 = groups[0], groups[1]
            if md > 0:
                higher, lower = g0, g1
            elif md < 0:
                higher, lower = g1, g0
            else:
                higher = lower = None
            if higher is not None:
                if significant:
                    plain = (
                        f"平均は「{higher}」のほうが「{lower}」より高く、"
                        "その差は統計的に意味のある大きさと考えられます。"
                    )
                else:
                    plain = (
                        f"平均は「{higher}」のほうがやや高いものの、"
                        "偶然の範囲を超えているとは言い切れません。"
                    )
    if plain is None:
        if significant:
            plain = f"p 値が有意水準 α（={alpha}）を下回りました。"
        else:
            plain = f"p 値が有意水準 α（={alpha}）以上でした。"
    st.markdown(f"**{plain}**")

    # 2. グループ別要約
    st.subheader("グループ別の要約")
    st.caption("結論の根拠となる、グループごとの人数・平均・ばらつきです。")
    st.dataframe(summary_df, use_container_width=True, hide_index=True)

    # 3. 差の大きさ
    st.subheader("差の大きさ")
    if diff:
        dcols = st.columns(2)
        dcols[0].metric("平均の差", common.fmt_num(diff.get("mean_diff")))
        dcols[1].metric("中央値の差", common.fmt_num(diff.get("median_diff")))
    eff = res.effect
    if eff is not None:
        ci_str = "—"
        if not (np.isnan(eff.ci_low) or np.isnan(eff.ci_high)):
            ci_str = (
                f"[{common.fmt_num(eff.ci_low)}, {common.fmt_num(eff.ci_high)}]"
            )
        ecols = st.columns(3)
        ecols[0].metric(eff.name, common.fmt_num(eff.value))
        ecols[1].metric("95% 信頼区間", ci_str)
        ecols[2].metric("解釈", eff.interpretation)
        if eff.comment:
            st.caption(eff.comment)

    # 4. 選ばれた検定名
    st.subheader("選ばれた検定")
    st.markdown(f"### {res.test_name}")

    # 5. なぜこの検定？
    _reason_box(res)

    # 6. 前提条件チェック
    st.subheader("前提条件チェック")
    _show_normality(res)
    st.caption(
        "対応：" + ("あり（同じ対象の前後比較など）" if "対応" in res.test_name or "paired" in res.test_name.lower() or "Wilcoxon" in res.test_name else "なし")
    )

    # 7. 検定の数値
    st.subheader("検定の数値")
    ncols = st.columns(3)
    ncols[0].metric("検定統計量", common.fmt_num(res.statistic))
    ncols[1].metric("自由度 (df)", _dof_str(res.dof))
    ncols[2].metric(
        "p 値", f"{common.fmt_p(res.pvalue)} {common.stars(res.pvalue)}"
    )
    if significant:
        st.success(f"p < α（={alpha}）なので、統計的に有意な差があります。")
    elif pvalue is not None and not np.isnan(pvalue):
        st.info(f"p ≥ α（={alpha}）なので、有意な差は認められませんでした。")

    # 多重比較（3群以上）
    if res.posthoc is not None:
        st.markdown("**多重比較（どの群とどの群が違うか）**")
        st.dataframe(res.posthoc, use_container_width=True, hide_index=True)

    # 8. 図表
    st.subheader("グラフで確認")
    chart_kind = st.radio(
        "グラフの種類",
        ["箱ひげ図", "バイオリンプロット"],
        horizontal=True,
        key="num_chart_kind",
    )
    try:
        if chart_kind == "バイオリンプロット":
            fig = visualizer.violin(df, value_col, group_col)
        else:
            fig = visualizer.boxplot(df, value_col, group_col)
        st.pyplot(fig)
        _figure_downloads(fig, "num_fig")
    except Exception as e:  # noqa: BLE001
        st.error(f"図の描画に失敗しました：{e}")

    # 9. 注意点
    caveats = _numeric_caveats(res, summary_df)
    if caveats:
        st.subheader("注意点")
        st.markdown("\n".join(f"- {c}" for c in caveats))

    # 10. ダウンロード
    _download_buttons(
        _summary_table(res, value_col, group_col, diff=diff), "num_dl"
    )


def _show_categorical_result(res, col1, col2, alpha: float) -> None:
    """カテゴリ関連の結論ファースト表示。"""
    pvalue = res.pvalue
    significant = (
        pvalue is not None and not np.isnan(pvalue) and pvalue < alpha
    )
    extra = res.extra or {}
    assumptions = res.assumptions or {}

    # 1. 結論
    st.header("結論")
    if significant:
        st.success(f"### ✅ 「{col1}」と「{col2}」には関連が認められました")
        st.markdown(
            "**2つの分類項目は独立とは言えず、互いに関係している可能性が高いです。**"
        )
    else:
        st.warning(f"### 「{col1}」と「{col2}」に関連があるとはいえませんでした")
        st.markdown(
            "**2つの分類項目が関係しているとは言い切れません。**"
        )

    # 2. クロス集計表
    if "crosstab" in extra:
        st.subheader("クロス集計表（観測度数）")
        st.dataframe(extra["crosstab"], use_container_width=True)

    # 行% / 列% の切り替え
    if "row_pct" in extra or "col_pct" in extra:
        st.subheader("割合で見る")
        pct_kind = st.radio(
            "表示する割合",
            ["行%（各行の中での割合）", "列%（各列の中での割合）"],
            horizontal=True,
            key="cat_pct_kind",
        )
        if pct_kind.startswith("行") and "row_pct" in extra:
            st.dataframe(extra["row_pct"], use_container_width=True)
        elif "col_pct" in extra:
            st.dataframe(extra["col_pct"], use_container_width=True)

    # 期待度数
    if "expected" in extra:
        st.subheader("期待度数")
        st.caption("各セルが独立だった場合に期待される度数です。")
        st.dataframe(extra["expected"].round(2), use_container_width=True)

    # 標準化残差
    if "std_resid" in extra:
        st.subheader("標準化残差")
        st.caption(
            "観測度数と期待度数のずれを標準化した値です。"
            "|残差| > 2 のセルが、関連の強さに特に寄与しています。"
        )
        st.dataframe(extra["std_resid"], use_container_width=True)

    # 選ばれた検定＋なぜ
    st.subheader("選ばれた検定")
    st.markdown(f"### {res.test_name}")
    _reason_box(res)

    # 効果量
    eff = res.effect
    if eff is not None:
        st.subheader("効果量（関連の強さ）")
        ci_str = "—"
        if not (np.isnan(eff.ci_low) or np.isnan(eff.ci_high)):
            ci_str = (
                f"[{common.fmt_num(eff.ci_low)}, {common.fmt_num(eff.ci_high)}]"
            )
        ecols = st.columns(3)
        ecols[0].metric(eff.name, common.fmt_num(eff.value))
        ecols[1].metric("95% 信頼区間", ci_str)
        ecols[2].metric("解釈", eff.interpretation)
        if eff.comment:
            st.caption(eff.comment)

    # 検定の数値
    st.subheader("検定の数値")
    ncols = st.columns(3)
    ncols[0].metric("検定統計量", common.fmt_num(res.statistic))
    ncols[1].metric("自由度 (df)", _dof_str(res.dof))
    ncols[2].metric(
        "p 値", f"{common.fmt_p(res.pvalue)} {common.stars(res.pvalue)}"
    )

    # 注意点
    notes: list[str] = []
    n_lt5 = assumptions.get("n_cells_expected_lt5")
    min_exp = assumptions.get("min_expected_freq")
    if n_lt5:
        notes.append(
            f"期待度数が5未満のセルが {int(n_lt5)} 個あります"
            f"（最小期待度数 = {common.fmt_num(min_exp)}）。"
            "カイ二乗検定の前提が十分に満たされていない可能性があります。"
        )
    elif min_exp is not None:
        notes.append(
            f"最小の期待度数は {common.fmt_num(min_exp)} で、"
            "すべてのセルで5以上のため検定の前提を満たしています。"
        )
    zero_note = assumptions.get("zero_cell_note")
    if zero_note:
        notes.append(zero_note)
    n_dropped = assumptions.get("n_dropped")
    if n_dropped:
        notes.append(f"欠損のため {int(n_dropped)} 件を除外して集計しています。")
    if notes:
        st.subheader("注意点")
        st.markdown("\n".join(f"- {c}" for c in notes))

    # ダウンロード
    _download_buttons(_summary_table(res, col1, col2), "cat_dl")


def _summary_table(res, value_col=None, group_col=None, diff=None) -> pd.DataFrame:
    """結果サマリ表を組み立てる（エクスポート用）。"""
    eff = res.effect
    row = {
        "検定": res.test_name,
        "検定統計量": common.fmt_num(res.statistic),
        "自由度": _dof_str(res.dof),
        "p値": common.fmt_p(res.pvalue),
        "有意性": common.stars(res.pvalue),
    }
    if diff:
        if "mean_diff" in diff:
            row["平均の差"] = common.fmt_num(diff.get("mean_diff"))
        if "median_diff" in diff:
            row["中央値の差"] = common.fmt_num(diff.get("median_diff"))
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
        "2群以上の数値の差を比較したい",
        "カテゴリの関連を調べたい",
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
            except ValueError as e:
                st.error(f"検定を実行できませんでした：{e}")
            except Exception as e:  # noqa: BLE001
                st.error(f"検定を実行できませんでした：{e}")

        res = st.session_state.get("hyp_num_res")
        meta = st.session_state.get("hyp_num_meta")
        if res is not None and meta is not None:
            value_col, group_col, alpha = meta
            _show_numeric_result(res, df, value_col, group_col, alpha)

# ============ カテゴリ関連パス ============
else:
    if len(categorical_cols) < 2:
        st.warning("カテゴリの列が2つ以上必要です。")
    else:
        col1 = st.selectbox("1つ目の分類項目", categorical_cols, key="cat_col1")
        col2 = st.selectbox(
            "2つ目の分類項目",
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
                except ValueError as e:
                    st.error(f"検定を実行できませんでした：{e}")
                except Exception as e:  # noqa: BLE001
                    st.error(f"検定を実行できませんでした：{e}")

        res = st.session_state.get("hyp_cat_res")
        meta = st.session_state.get("hyp_cat_meta")
        if res is not None and meta is not None:
            col1, col2, alpha = meta
            _show_categorical_result(res, col1, col2, alpha)

common.render_footer()
