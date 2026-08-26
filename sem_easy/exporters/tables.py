"""SEMResult から出力用の表を組み立てる（単一の真実の唯一の変換点）。

画面・Excel・Word・PDF・再現コードは、すべてこのモジュールが作った表を使う。
そのため、どの出力形式でも数値が一致する。
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from modules import interpret, reproduce


def model_fit_table(result) -> pd.DataFrame:
    """モデル全体の適合度（論文報告に必要な指標一式）。"""
    f = result.fit
    rows = [
        {"指標": "χ²（カイ二乗値）", "値": round(f.chi2, 4)},
        {"指標": "df（自由度）", "値": f.df},
        {"指標": "p値", "値": round(f.pvalue, 4)},
        {"指標": "CFI", "値": round(f.cfi, 4)},
        {"指標": "TLI", "値": round(f.tli, 4)},
        {"指標": "RMSEA", "値": round(f.rmsea, 4)},
        {"指標": "RMSEA 90%CI 下限", "値": round(f.rmsea_lo, 4)},
        {"指標": "RMSEA 90%CI 上限", "値": round(f.rmsea_hi, 4)},
        {"指標": "SRMR", "値": round(f.srmr, 4)},
        {"指標": "AIC", "値": round(f.aic, 3)},
        {"指標": "BIC", "値": round(f.bic, 3)},
        {"指標": "分析に用いた n", "値": f.n_used},
        {"指標": "推定パラメータ数", "値": f.npar},
    ]
    return pd.DataFrame(rows)


def parameter_table(result) -> pd.DataFrame:
    """係数表（非標準化・標準化・標準誤差・z・p・95%CI）。"""
    p = result.params
    if p is None or len(p) == 0:
        return pd.DataFrame()
    cols = ["種別", "表記", "非標準化係数", "標準化係数", "標準誤差",
            "z値", "p値", "95%CI下限", "95%CI上限"]
    out = p[[c for c in cols if c in p.columns]].copy()
    for c in ("非標準化係数", "標準化係数", "標準誤差", "z値", "95%CI下限", "95%CI上限"):
        if c in out.columns:
            out[c] = out[c].astype(float).round(4)
    if "p値" in out.columns:
        out["p値"] = out["p値"].astype(float).round(4)
    return out.reset_index(drop=True)


def fit_judgement_table(result) -> pd.DataFrame:
    """指標ごとの判定（断定を避けた表現）。"""
    return pd.DataFrame(interpret.index_table_rows(result.fit))


def diagnostics_table(result) -> pd.DataFrame:
    rows = []
    for block in interpret.diagnostics_summary(result):
        for detail in block["詳細"]:
            rows.append({"段階": block["段階"], "状態": block["状態"], "内容": detail})
    return pd.DataFrame(rows)


def settings_table(result) -> pd.DataFrame:
    return pd.DataFrame(reproduce.settings_table(result))


def all_tables(result) -> dict:
    """出力に含める表の一式。Excel/Word/PDF はこれを共有する。"""
    tables = {
        "分析条件": settings_table(result),
        "適合度": model_fit_table(result),
        "適合度の判定": fit_judgement_table(result),
        "係数": parameter_table(result),
    }
    if result.r2 is not None and len(result.r2):
        tables["決定係数R2"] = result.r2
    if result.effects is not None and len(result.effects):
        tables["効果分解"] = result.effects
    tables["診断"] = diagnostics_table(result)
    return tables
