"""⑤ 結果・出力：すべて同一の推定結果（SEMResult）から表示・出力する。"""
from __future__ import annotations

import pandas as pd
import streamlit as st

from modules import (auth, candidates, common, estimator, interpret,
                     pathdiagram, reproduce)
from exporters import excel_exporter, pdf_exporter, tables, word_exporter

user_id = auth.require_login()
res = common.get_state(user_id, "sem_result")

st.title("⑤ 結果・出力")

if res is None or res.error:
    st.warning("先に「④ 推定」を実行してください。")
    st.page_link("pages/04_estimate.py", label="➡ ④ 推定へ", icon="⚙️")
    st.stop()

st.caption(
    "このページのすべての数値・図・レポート・再現コードは、"
    "**1回の推定結果から生成**しています（画面ごとに別の値になることはありません）。"
)

c1, c2, c3, c4 = st.columns(4)
c1.metric("モデル", res.model_name)
c2.metric("推定法", res.estimator)
c3.metric("分析に用いた n", f"{res.n_used:,}")
c4.metric("推定パラメータ数", res.fit.npar)

if res.unused_vars:
    st.info(
        "**未使用の変数**（読み込んだがモデルに入れていない変数）："
        + "、".join(map(str, res.unused_vars))
        + "　— 入れ忘れでないかご確認ください。"
    )

tab_fit, tab_coef, tab_eff, tab_fig, tab_cmp, tab_out = st.tabs(
    ["適合度", "係数・R²", "効果分解", "パス図", "モデル比較", "出力・再現コード"]
)

# ---------- 適合度 ----------
with tab_fit:
    st.markdown(interpret.fit_summary(res.fit))
    st.markdown("**指標ごとの判定**")
    st.dataframe(tables.fit_judgement_table(res), use_container_width=True, hide_index=True)
    st.markdown("**論文報告用の数値**")
    st.dataframe(tables.model_fit_table(res), use_container_width=True, hide_index=True)
    st.warning(interpret.CAUSAL_CAVEAT)

# ---------- 係数 ----------
with tab_coef:
    st.markdown("**係数（非標準化・標準化・標準誤差・z値・p値・95%信頼区間）**")
    st.dataframe(tables.parameter_table(res), use_container_width=True, hide_index=True)
    st.markdown("**主要なパスの説明**")
    st.markdown(interpret.coefficient_summary(res))
    if res.r2 is not None and len(res.r2):
        st.markdown("**決定係数 R²（どの程度説明できたか）**")
        st.dataframe(res.r2, use_container_width=True, hide_index=True)

# ---------- 効果分解 ----------
with tab_eff:
    if res.effects is None or len(res.effects) == 0:
        st.info("効果分解の対象となるパスがありません。")
    else:
        st.markdown("**直接効果・間接効果・総効果**")
        st.dataframe(res.effects, use_container_width=True, hide_index=True)
        st.markdown(interpret.effects_summary(res))

# ---------- パス図 ----------
with tab_fig:
    c1, c2, c3 = st.columns(3)
    std = c1.radio("係数の種類", ["標準化係数", "非標準化係数"], horizontal=True) == "標準化係数"
    show_p = c2.checkbox("有意水準（*）を表示", value=True)
    show_ind = c3.checkbox("観測変数を表示", value=True)
    try:
        fig = pathdiagram.draw(res, standardized=std, show_pvalue=show_p,
                               show_indicators=show_ind)
        st.pyplot(fig)
        d1, d2, d3 = st.columns(3)
        d1.download_button("PNG（300dpi）", pathdiagram.to_bytes(fig, "png"),
                           "path_diagram.png", "image/png", use_container_width=True)
        d2.download_button("SVG（ベクター）", pathdiagram.to_bytes(fig, "svg"),
                           "path_diagram.svg", "image/svg+xml", use_container_width=True)
        d3.download_button("PDF", pathdiagram.to_bytes(fig, "pdf"),
                           "path_diagram.pdf", "application/pdf", use_container_width=True)
        st.caption(
            "測定モデルの矢印は「潜在変数 → 観測変数」の向きで描いています。"
            "図の係数は上の係数表と同一の値です。"
        )
    except Exception as e:  # noqa: BLE001
        st.error(f"パス図の作成に失敗しました：{e}")

# ---------- モデル比較 ----------
with tab_cmp:
    cand_res = common.get_state(user_id, "candidate_results")
    if not cand_res:
        st.info("候補モデルを一括推定すると、ここで比較できます（③ → ④ の手順）。")
    else:
        table = candidates.evaluate(cand_res)
        st.markdown("**候補モデルの比較**")
        st.dataframe(table, use_container_width=True, hide_index=True)

        winners = candidates.criterion_winners(table)
        st.markdown("**指標ごとに、どのモデルを支持しているか**")
        if winners:
            st.dataframe(
                pd.DataFrame([{"指標": k, "支持するモデル": v} for k, v in winners.items()]),
                use_container_width=True, hide_index=True,
            )
        st.warning(candidates.summarize_disagreement(winners))

        with st.expander("参考総合点を表示する（正しさを表す点数ではありません）"):
            scored = candidates.reference_score(table)
            cols = ["モデル名", "参考総合点", "_適合(CFI)", "_適合(RMSEA)",
                    "_適合(SRMR)", "_簡潔性", "_警告の少なさ"]
            st.dataframe(scored[[c for c in cols if c in scored.columns]],
                         use_container_width=True, hide_index=True)
            st.caption(candidates.SCORE_DISCLAIMER)

# ---------- 出力 ----------
with tab_out:
    tb = tables.all_tables(res)
    st.markdown("**数値表・レポートのダウンロード**")
    try:
        fig = pathdiagram.draw(res, standardized=True)
        png = pathdiagram.to_bytes(fig, "png")
        images = [("パス図（標準化係数）", png)]
    except Exception:  # noqa: BLE001
        images = None

    c1, c2, c3 = st.columns(3)
    c1.download_button(
        "Excel（数値表一式）", excel_exporter.export(tb),
        "sem_results.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )
    try:
        c2.download_button(
            "Word（レポート）", word_exporter.export(res, tb, images=images),
            "sem_report.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            use_container_width=True,
        )
    except Exception:  # noqa: BLE001
        with c2:
            st.button("Word（レポート）", disabled=True, use_container_width=True)
            st.caption("この環境では Word を作成できません。")
    # PDF はブラウザ実行版では利用できない場合があるため、失敗しても他の出力を妨げない
    try:
        pdf_bytes = pdf_exporter.export(res, tb, images=images)
        c3.download_button(
            "PDF（レポート）", pdf_bytes,
            "sem_report.pdf", "application/pdf", use_container_width=True,
        )
    except Exception:  # noqa: BLE001
        with c3:
            st.button("PDF（レポート）", disabled=True, use_container_width=True)
            st.caption(
                "この環境では PDF を作成できません。"
                "Excel / Word をご利用いただくか、パソコン版をお使いください。"
            )

    st.divider()
    st.markdown("**分析条件（保存・再現のため）**")
    st.dataframe(tables.settings_table(res), use_container_width=True, hide_index=True)

    st.markdown("**再現コード**")
    t1, t2 = st.tabs(["R / lavaan（照合用）", "Python / semopy（本アプリと同一）"])
    with t1:
        code_r = reproduce.lavaan_code(res)
        st.code(code_r, language="r")
        st.download_button("lavaan コードを保存", code_r, "reproduce_lavaan.R",
                           "text/plain", use_container_width=True)
    with t2:
        code_py = reproduce.python_code(res)
        st.code(code_py, language="python")
        st.download_button("Python コードを保存", code_py, "reproduce_semopy.py",
                           "text/plain", use_container_width=True)

common.render_footer()
