"""③ モデル作成：手動編集と候補モデルの自動生成。"""
from __future__ import annotations

import pandas as pd
import streamlit as st

from modules import auth, candidates, common, data_loader, scales
from modules.model_spec import ModelSpec

user_id = auth.require_login()
load = common.require_data(user_id)

st.title("③ モデル作成")

df = load.data
scale_map = common.get_state(user_id, "scales") or {}
if load.kind == data_loader.INDIVIDUAL:
    usable_vars = [v for v in df.columns if scale_map.get(v) != scales.UNUSABLE]
else:
    usable_vars = list(df.columns)

tab_manual, tab_auto = st.tabs(["手動でモデルを組む", "候補モデルを自動生成する"])

# ============ 手動 ============
with tab_manual:
    st.markdown(
        "潜在変数（構成概念）に観測変数を割り当て、変数間のパス（矢印）を指定します。"
        "測定モデルの矢印は **潜在変数 → 観測変数** の向きで扱います"
        "（目に見えない性質が、各質問項目への回答に表れる、という考え方）。"
    )

    st.subheader("潜在変数の設定")
    n_lat = st.number_input("潜在変数の数", min_value=0, max_value=10, value=2, step=1)

    measurement: dict = {}
    assigned: list = []
    for i in range(int(n_lat)):
        c1, c2 = st.columns([1, 2])
        with c1:
            name = st.text_input(f"潜在変数 {i+1} の名前", value=f"因子{i+1}", key=f"lat_{i}")
        with c2:
            remaining = [v for v in usable_vars if v not in assigned]
            items = st.multiselect(
                f"『{name}』の観測変数", remaining, key=f"ind_{i}",
                help="この潜在変数を測っている質問項目を選びます。通常3個以上が目安です。",
            )
        if name and items:
            measurement[name] = items
            assigned.extend(items)

    st.subheader("パス（矢印）の設定")
    node_options = list(measurement.keys()) + [v for v in usable_vars if v not in assigned]
    st.caption("「原因 → 結果」の向きで指定します。因果の向きは利用者が指定します（データからは決めません）。")

    n_path = st.number_input("パスの数", min_value=0, max_value=20, value=1, step=1)
    regressions: list = []
    for i in range(int(n_path)):
        c1, c2 = st.columns(2)
        with c1:
            src = st.selectbox(f"パス{i+1}：原因", ["—"] + node_options, key=f"src_{i}")
        with c2:
            dst = st.selectbox(f"パス{i+1}：結果", ["—"] + node_options, key=f"dst_{i}")
        if src != "—" and dst != "—" and src != dst:
            regressions.append((src, dst))

    spec = ModelSpec(measurement=measurement, regressions=regressions)

    st.divider()
    st.subheader("このモデルの内容")
    problems = spec.validate()
    c1, c2 = st.columns([1, 1])
    with c1:
        st.markdown(f"**モデル名（構成から自動で決まります）**")
        st.info(spec.derive_name())
        st.caption("モデル名は実際の矢印の構成から自動で付けるため、名前と図の内容が食い違いません。")
    with c2:
        st.markdown("**モデル定義（lavaan 構文）**")
        st.code(spec.to_lavaan() or "（未設定）", language="text")

    for p in problems:
        st.warning(p)

    if st.button("このモデルを使う", type="primary", disabled=bool(problems) or not (measurement or regressions)):
        common.set_state(user_id, "spec", spec)
        common.set_state(user_id, "sem_result", None)
        st.success(f"モデル『{spec.derive_name()}』を設定しました。")
        st.page_link("pages/04_estimate.py", label="➡ ④ 推定へ", icon="⚙️")

# ============ 自動生成 ============
with tab_auto:
    st.markdown(
        "利用者が **許可した向き** の範囲内で候補モデルを組み合わせ、複数案を作ります。"
        "データの相関から因果の向きを推測することはしません。"
    )
    struct_vars = st.multiselect(
        "候補生成に使う変数（潜在変数を作った場合はその名前を使ってください）",
        node_options if "node_options" in dir() else usable_vars,
        default=[],
    )

    st.markdown("**許可する向き**（ここに入れた向きだけを探索します）")
    allowed = []
    if len(struct_vars) >= 2:
        for i, a in enumerate(struct_vars):
            for b in struct_vars:
                if a == b:
                    continue
                if st.checkbox(f"{a} → {b}", key=f"allow_{a}_{b}", value=False):
                    allowed.append((a, b))

    c1, c2 = st.columns(2)
    max_paths = c1.number_input("1モデルの最大パス数", min_value=1, max_value=10, value=3)
    max_cand = c2.number_input("候補の最大数", min_value=1, max_value=50, value=8)

    if st.button("候補モデルを生成する", disabled=len(allowed) == 0):
        cons = candidates.Constraints(
            allowed_pairs=allowed, max_paths=int(max_paths), max_candidates=int(max_cand)
        )
        meas = common.get_state(user_id, "spec").measurement if common.get_state(user_id, "spec") else {}
        specs = candidates.generate(meas, struct_vars, cons)
        common.set_state(user_id, "candidate_specs", specs)
        st.success(f"{len(specs)} 個の候補モデルを作成しました。「④ 推定」でまとめて比較できます。")

    cs = common.get_state(user_id, "candidate_specs")
    if cs:
        st.markdown("**生成された候補**")
        st.dataframe(
            pd.DataFrame([{"モデル名": s.derive_name(),
                           "パス数": len(s.regressions),
                           "定義": s.to_lavaan().replace("\n", " / ")} for s in cs]),
            use_container_width=True, hide_index=True,
        )
        st.page_link("pages/04_estimate.py", label="➡ ④ 推定へ", icon="⚙️")

common.render_footer()
