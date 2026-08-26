"""SEMEasy 中核機能の検証。

特に重視する点（依頼者要望）：
- 推定値が既知の正解（OLS）と一致すること
- 画面・数値表・レポート・再現コードの数値が完全に一致すること
- モデル名が実際のパス構成と一致すること
- 適合度の判定が「良好」と断定しないこと
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from modules import (candidates, estimator, fitindices, interpret,
                     pathdiagram, reproduce, scales)
from modules.model_spec import ModelSpec, derive_structural_label
from exporters import excel_exporter, pdf_exporter, tables, word_exporter

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "sample_data"


@pytest.fixture(scope="module")
def mediation_df():
    return pd.read_csv(SAMPLE / "sample_媒介モデル.csv")


@pytest.fixture(scope="module")
def cfa_df():
    return pd.read_csv(SAMPLE / "sample_cfa_正常例.csv")


@pytest.fixture(scope="module")
def med_result(mediation_df):
    spec = ModelSpec(regressions=[
        ("研修参加度", "自己効力感"), ("自己効力感", "業務成果"), ("研修参加度", "業務成果")])
    return estimator.estimate(mediation_df, spec)


@pytest.fixture(scope="module")
def cfa_result(cfa_df):
    spec = ModelSpec(
        measurement={"自己効力感": ["se_01", "se_02", "se_03"],
                     "主観的幸福感": ["wb_01", "wb_02", "wb_03"]},
        regressions=[("自己効力感", "主観的幸福感")])
    return estimator.estimate(cfa_df, spec)


# ---------- 推定の正確性 ----------

def test_path_model_matches_ols(mediation_df, med_result):
    """パス解析の推定値が OLS 回帰と一致すること（既知の正解との照合）。

    最尤法は共分散を N で割り、OLS は N-1 で割るため、ごく小さな差が生じる。
    そのため許容誤差は 1% とする（係数の取り違え等の誤りはこの範囲を大きく超える）。
    """
    import statsmodels.api as sm

    d = mediation_df
    m1 = sm.OLS(d["自己効力感"], sm.add_constant(d[["研修参加度"]])).fit()
    m2 = sm.OLS(d["業務成果"], sm.add_constant(d[["研修参加度", "自己効力感"]])).fit()

    p = med_result.params
    def coef(src, dst):
        row = p[(p["演算子"] == "~") & (p["右辺"] == src) & (p["左辺"] == dst)]
        return float(row["非標準化係数"].iloc[0])

    assert math.isclose(coef("研修参加度", "自己効力感"), m1.params["研修参加度"], rel_tol=1e-2)
    assert math.isclose(coef("研修参加度", "業務成果"), m2.params["研修参加度"], rel_tol=1e-2)
    assert math.isclose(coef("自己効力感", "業務成果"), m2.params["自己効力感"], rel_tol=1e-2)


def test_indirect_effect_is_product(med_result):
    """間接効果が、経路上の係数の積と厳密に一致すること。"""
    p = med_result.params
    def coef(src, dst):
        row = p[(p["演算子"] == "~") & (p["右辺"] == src) & (p["左辺"] == dst)]
        return float(row["非標準化係数"].iloc[0])

    a = coef("研修参加度", "自己効力感")
    b = coef("自己効力感", "業務成果")
    c = coef("研修参加度", "業務成果")

    e = med_result.effects
    row = e[(e["説明変数"] == "研修参加度") & (e["結果変数"] == "業務成果")].iloc[0]
    assert math.isclose(float(row["間接効果"]), a * b, rel_tol=1e-3)
    assert math.isclose(float(row["直接効果"]), c, rel_tol=1e-3)
    # 総効果 ＝ 直接 ＋ 間接
    assert math.isclose(float(row["総効果"]),
                        float(row["直接効果"]) + float(row["間接効果"]), rel_tol=1e-6)
    # 内訳の文字列に、掛け合わせた係数が示されていること
    assert "×" in str(row["間接効果の内訳（掛け合わせた係数）"])


def test_fit_indices_reasonable(cfa_result):
    f = cfa_result.fit
    assert f.df > 0
    assert 0.0 <= f.cfi <= 1.0
    assert f.rmsea >= 0.0
    assert f.rmsea_lo <= f.rmsea <= f.rmsea_hi + 1e-9
    assert np.isfinite(f.srmr)
    # 推定パラメータ数の検算： p(p+1)/2 - df
    p = len(cfa_result.spec.indicators)
    assert f.npar == p * (p + 1) // 2 - f.df


# ---------- 単一の真実（画面・表・レポート・再現コードの一致） ----------

def test_single_source_of_truth(cfa_result):
    """画面・数値表・レポート・再現コードの数値が完全に一致すること。"""
    res = cfa_result
    tb = tables.all_tables(res)

    # 画面（SEMResult） vs 数値表
    fit_tbl = tb["適合度"].set_index("指標")["値"]
    assert math.isclose(float(fit_tbl["CFI"]), round(res.fit.cfi, 4), abs_tol=1e-9)
    assert math.isclose(float(fit_tbl["RMSEA"]), round(res.fit.rmsea, 4), abs_tol=1e-9)
    assert math.isclose(float(fit_tbl["SRMR"]), round(res.fit.srmr, 4), abs_tol=1e-9)
    assert int(fit_tbl["分析に用いた n"]) == res.n_used
    assert int(fit_tbl["df（自由度）"]) == res.fit.df

    # 係数表 vs SEMResult
    ptbl = tables.parameter_table(res)
    src = res.params
    assert len(ptbl) == len(src)
    for i in range(len(src)):
        assert math.isclose(float(ptbl["非標準化係数"].iloc[i]),
                            round(float(src["非標準化係数"].iloc[i]), 4), abs_tol=1e-9)

    # 解説文（レポート本文）に、同じ適合度の値が現れること
    text = interpret.fit_summary(res.fit)
    assert f"{res.fit.cfi:.3f}" in text
    assert f"{res.fit.rmsea:.3f}" in text
    assert f"{res.n_used:,}" in text

    # 再現コードに、同じモデル定義と推定法が入っていること
    code_r = reproduce.lavaan_code(res)
    code_py = reproduce.python_code(res)
    for line in res.lavaan_syntax.splitlines():
        if line.strip() and not line.startswith("#"):
            assert line.strip() in code_r
            assert line.strip() in code_py
    assert res.estimator in code_py


def test_exports_build_from_same_result(cfa_result):
    """3形式の出力が同一の表から生成できること。"""
    tb = tables.all_tables(cfa_result)
    x = excel_exporter.export(tb)
    w = word_exporter.export(cfa_result, tb)
    p = pdf_exporter.export(cfa_result, tb)
    assert x[:2] == b"PK"
    assert w[:2] == b"PK"
    assert p[:4] == b"%PDF"


# ---------- モデル名と中身の一致 ----------

@pytest.mark.parametrize("edges,expect", [
    ([("X", "M"), ("M", "Y")], "完全媒介"),
    ([("X", "M"), ("M", "Y"), ("X", "Y")], "部分媒介"),
    ([("X", "Y")], "直接効果"),
    ([], "測定モデル"),
])
def test_model_name_matches_paths(edges, expect):
    assert expect in derive_structural_label(edges)


def test_model_name_in_result_matches_spec(med_result):
    assert med_result.model_name == med_result.spec.derive_name()
    assert "部分媒介" in med_result.model_name  # X→M→Y かつ X→Y


# ---------- 測定モデルの矢印の向き ----------

def test_measurement_arrow_direction(cfa_result):
    """因子負荷が「潜在変数 → 観測変数」の向きで表されること。"""
    load = cfa_result.params[cfa_result.params["種別"] == "因子負荷（潜在→観測）"]
    assert len(load) > 0
    for _, r in load.iterrows():
        assert r["右辺"] in cfa_result.spec.latents      # 原因側＝潜在変数
        assert r["左辺"] in cfa_result.spec.indicators   # 結果側＝観測変数
        assert r["表記"].startswith(r["右辺"])           # 表記も 潜在 → 観測


# ---------- 適合度の表現（断定を避ける） ----------

def test_fit_labels_are_cautious():
    """『良好』と断定せず、目安との関係で述べること。"""
    assert fitindices.judge_index("CFI", 0.97) == fitindices.LABEL_GOOD
    assert fitindices.judge_index("CFI", 0.92) == fitindices.LABEL_MARGINAL
    assert fitindices.judge_index("CFI", 0.80) == fitindices.LABEL_POOR
    for label in (fitindices.LABEL_GOOD, fitindices.LABEL_MARGINAL, fitindices.LABEL_POOR):
        assert "良好" not in label


def test_mixed_indices_reported_as_disagreement():
    """指標が割れている場合、その旨が明示されること。"""
    fit = fitindices.compute(chi2=300.0, df=50, baseline_chi2=2000.0, baseline_df=66,
                             n_used=300, npar=20, srmr=0.05)
    label, _ = fitindices.overall_judgement(fit)
    assert label in ("指標によって判断が分かれている", "境界的である",
                     "主要指標は目安を満たしていない", "一部の指標が目安を満たしていない")


# ---------- 尺度と推定法 ----------

def test_scale_detection():
    rng = np.random.default_rng(0)
    df = pd.DataFrame({
        "連続": rng.normal(0, 1, 200),
        "リッカート5": rng.integers(1, 6, 200),
        "二値": rng.integers(0, 2, 200),
    })
    assert scales.detect_scale(df["連続"]) == scales.CONTINUOUS
    assert scales.detect_scale(df["リッカート5"]) == scales.ORDINAL
    assert scales.detect_scale(df["二値"]) == scales.BINARY


def test_estimator_recommendation_reasons():
    r = scales.recommend({"a": scales.ORDINAL}, has_missing=False)
    assert r["estimator"] == "DWLS"
    assert "順序尺度" in r["reason"]          # なぜその方法かを説明している
    r2 = scales.recommend({"a": scales.CONTINUOUS}, has_missing=True)
    assert r2["estimator"] == "FIML"


def test_invalid_estimator_missing_combination_blocked():
    """使えない組合せ（DWLS × FIML）が選べないこと。"""
    assert scales.is_valid_combination("MLW", "listwise")
    assert scales.is_valid_combination("FIML", "fiml")
    assert not scales.is_valid_combination("DWLS", "fiml")
    for c in scales.valid_combinations():
        assert scales.is_valid_combination(c["estimator"], c["missing"])


# ---------- 診断 ----------

def test_diagnostics_three_stages(cfa_result):
    blocks = interpret.diagnostics_summary(cfa_result)
    assert len(blocks) == 3
    assert "計算できる形" in blocks[0]["段階"]
    assert "正常に終了" in blocks[1]["段階"]
    assert "不自然な点" in blocks[2]["段階"]


def test_problem_data_raises_warnings():
    """問題のあるデータで警告が出ること。"""
    df = pd.read_csv(SAMPLE / "sample_問題データ.csv")
    spec = ModelSpec(measurement={"F": ["x_01", "x_02", "x_03", "x_04"]})
    res = estimator.estimate(df, spec)
    assert res.diagnostics.has_any or res.error is not None


def test_spec_validation_catches_thin_factor():
    problems = ModelSpec(measurement={"F": ["x1"]}).validate()
    assert any("観測変数" in p for p in problems)


# ---------- 候補モデルの比較（正解を断定しない） ----------

def test_candidate_generation_respects_constraints():
    cons = candidates.Constraints(
        allowed_pairs=[("X", "M"), ("M", "Y"), ("X", "Y")],
        forbidden_paths=[("X", "Y")], max_paths=3, max_candidates=20)
    specs = candidates.generate({}, ["X", "M", "Y"], cons)
    for s in specs:
        assert ("X", "Y") not in s.regressions   # 禁止パスが含まれない


def test_score_disclaimer_states_not_truth():
    assert "正しさを表すものではありません" in candidates.SCORE_DISCLAIMER


def test_disagreement_message():
    t = pd.DataFrame({
        "モデル名": ["A", "B"], "CFI": [0.98, 0.95], "RMSEA": [0.05, 0.02],
        "SRMR": [0.04, 0.06], "AIC": [10, 8], "BIC": [20, 15],
        "推定パラメータ数": [8, 6], "警告数": [0, 0]})
    w = candidates.criterion_winners(t)
    msg = candidates.summarize_disagreement(w)
    assert "分かれています" in msg


# ---------- 図 ----------

def test_path_diagram_no_tofu(cfa_result):
    """パス図に日本語の文字化け（豆腐）が出ないこと。"""
    import warnings

    fig = pathdiagram.draw(cfa_result, standardized=True)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        png = pathdiagram.to_bytes(fig, "png")
        svg = pathdiagram.to_bytes(fig, "svg")
        pdf = pathdiagram.to_bytes(fig, "pdf")
    tofu = [w for w in caught if "missing from font" in str(w.message)]
    assert not tofu, f"豆腐が発生: {[str(w.message) for w in tofu][:3]}"
    assert png[:4] == b"\x89PNG"
    assert b"<svg" in svg[:400]
    assert pdf[:4] == b"%PDF"


# ---------- 再現性 ----------

def test_reproducibility_same_settings_same_result(mediation_df):
    """同じデータ・設定なら、常に同じ結果になること。"""
    spec = ModelSpec(regressions=[("研修参加度", "自己効力感"), ("自己効力感", "業務成果")])
    r1 = estimator.estimate(mediation_df, spec, seed=42)
    r2 = estimator.estimate(mediation_df, spec, seed=42)
    a = r1.params["非標準化係数"].to_numpy(dtype=float)
    b = r2.params["非標準化係数"].to_numpy(dtype=float)
    assert np.allclose(a, b, equal_nan=True)
    assert math.isclose(r1.fit.cfi, r2.fit.cfi, abs_tol=1e-12)


def test_settings_recorded_for_reproduction(cfa_result):
    """再現に必要な条件が記録されていること。"""
    s = cfa_result.settings
    for key in ("推定法", "欠損値の扱い", "乱数シード", "アプリ版", "semopy版", "実行日時", "使用変数"):
        assert key in s


# ---------- 欠損データ（FIML）----------

def test_fiml_produces_valid_fit_indices():
    """FIML（欠損あり）でも適合度が算出できること。

    推定ライブラリ側のベースライン（独立モデル）が不正になる場合があるため、
    自前で計算し直している。その補正が効いていることを確認する。
    """
    df = pd.read_csv(SAMPLE / "sample_欠損あり.csv")
    spec = ModelSpec(
        measurement={"F1": ["se_01", "se_02", "se_03"],
                     "F2": ["wb_01", "wb_02", "wb_03"]},
        regressions=[("F1", "F2")])
    res = estimator.estimate(df, spec, estimator="FIML", missing="fiml")
    assert res.diagnostics.converged
    f = res.fit
    assert np.isfinite(f.cfi) and 0.0 <= f.cfi <= 1.0
    assert np.isfinite(f.srmr)
    # ベースラインは独立モデルとして妥当な大きさであること
    assert f.baseline_chi2 > f.baseline_df > 0


def test_baseline_computation():
    """独立モデルの χ²・自由度の計算が妥当であること。"""
    rng = np.random.default_rng(1)
    z = rng.normal(0, 1, 500)
    X = np.column_stack([z + rng.normal(0, 0.5, 500) for _ in range(4)])
    S = np.cov(X.T, ddof=1)
    chi2_b, df_b = fitindices.baseline_from_covariance(S, 500)
    assert df_b == 4 * 3 // 2          # p(p-1)/2
    assert chi2_b > df_b                # 相関があるので独立モデルは棄却される


def test_ordinal_data_uses_dwls():
    """順序尺度のデータで DWLS が推奨され、推定できること。"""
    df = pd.read_csv(SAMPLE / "sample_順序尺度_5件法.csv")
    sc = {c: scales.detect_scale(df[c]) for c in df.columns}
    assert all(v == scales.ORDINAL for v in sc.values())
    rec = scales.recommend(sc, has_missing=False)
    assert rec["estimator"] == "DWLS"
    spec = ModelSpec(
        measurement={"因子A": ["q1_1", "q1_2", "q1_3"],
                     "因子B": ["q2_1", "q2_2", "q2_3"]},
        regressions=[("因子A", "因子B")])
    res = estimator.estimate(df, spec, estimator="DWLS")
    assert res.diagnostics.converged
