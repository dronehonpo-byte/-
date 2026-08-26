"""④ 推定：単一モデルの推定と、候補モデルの一括比較。"""
from __future__ import annotations

import pandas as pd
import streamlit as st

from modules import auth, candidates, common, data_loader, estimator, interpret

user_id = auth.require_login()
load = common.require_data(user_id)

st.title("④ 推定")

spec = common.get_state(user_id, "spec")
cand_specs = common.get_state(user_id, "candidate_specs")

if spec is None and not cand_specs:
    st.warning("先に「③ モデル作成」でモデルを設定してください。")
    st.page_link("pages/03_model.py", label="➡ ③ モデル作成へ", icon="🧩")
    st.stop()

est = common.get_state(user_id, "estimator", "MLW")
miss = common.get_state(user_id, "missing", "listwise")

c1, c2, c3 = st.columns(3)
c1.metric("推定法", est)
c2.metric("欠損値の扱い", miss)
boot = c3.number_input(
    "ブートストラップ回数（間接効果の信頼区間）", min_value=0, max_value=2000, value=0, step=100,
    help="0 で実行しません。個票データのみ対応します。回数を増やすと時間がかかります。",
)
seed = st.number_input("乱数シード（再現性のため固定します）", min_value=0, value=42, step=1)

if load.kind != data_loader.INDIVIDUAL and boot:
    st.info("行列入力のため、ブートストラップは実行できません（個票データが必要です）。")
    boot = 0

df = load.data

# ---- 単一モデルの推定 ----
if spec is not None and st.button("推定を実行する", type="primary"):
    with st.spinner("推定しています…"):
        res = estimator.estimate(
            df, spec, estimator=est, missing=miss,
            bootstrap=int(boot), seed=int(seed),
            app_version=common.APP_VERSION,
        )
    common.set_state(user_id, "sem_result", res)
    if res.error:
        st.error(res.error)
    else:
        st.success(f"推定が完了しました：{res.model_name}")

# ---- 候補モデルの一括推定 ----
if cand_specs and st.button(f"候補モデル {len(cand_specs)} 件をまとめて推定する"):
    results = []
    prog = st.progress(0.0)
    for i, s in enumerate(cand_specs):
        try:
            results.append(estimator.estimate(
                df, s, estimator=est, missing=miss, bootstrap=0,
                seed=int(seed), app_version=common.APP_VERSION))
        except Exception:  # noqa: BLE001
            results.append(None)
        prog.progress((i + 1) / len(cand_specs))
    common.set_state(user_id, "candidate_results", [r for r in results if r is not None])
    st.success("候補モデルの推定が完了しました。「⑤ 結果・出力」で比較できます。")

# ---- 診断（3段階）----
res = common.get_state(user_id, "sem_result")
if res is not None:
    st.divider()
    st.subheader("診断")
    st.caption(
        "「計算が終了したこと」と「研究上問題のない結果が得られたこと」は別です。"
        "次の3点を分けて確認してください。"
    )
    for block in interpret.diagnostics_summary(res):
        ok = block["状態"] in ("問題なし", "正常終了")
        with st.expander(f"{block['段階']}　—　{block['状態']}", expanded=not ok):
            for d in block["詳細"]:
                (st.success if ok else st.warning)(d)

    st.info(interpret.sample_adequacy(res))
    if not res.error:
        st.page_link("pages/05_result.py", label="➡ ⑤ 結果・出力へ", icon="📊")

common.render_footer()
