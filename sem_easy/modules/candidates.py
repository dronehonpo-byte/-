"""候補モデルの自動生成と、透明な順位付け。

依頼者要望への対応：
- 相関のみから因果方向を断定しない（方向は利用者が許可した範囲でのみ探索する）。
- 「正解」を提示せず、適合度・簡潔性・警告の有無を**別々の判断材料**として示す。
- 総合点は参考値であることを明記し、計算方法も開示する。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from itertools import combinations

import numpy as np
import pandas as pd

from .model_spec import ModelSpec


@dataclass
class Constraints:
    """利用者が指定する探索の制約。"""

    required_paths: list = field(default_factory=list)   # 必ず含めるパス [(from,to)]
    forbidden_paths: list = field(default_factory=list)  # 禁止するパス [(from,to)]
    allowed_pairs: list = field(default_factory=list)    # 方向を許可した組 [(from,to)]
    max_paths: int = 4                                   # 1モデルあたりの最大パス数
    max_candidates: int = 20                             # 生成する候補の上限


def generate(
    measurement: dict,
    structural_vars: list,
    constraints: Constraints,
) -> list:
    """制約の範囲内で候補モデルを列挙する。

    重要：因果方向は constraints.allowed_pairs（利用者が許可した向き）からのみ作る。
    データの相関から方向を推測することはしない。
    """
    pool = [p for p in constraints.allowed_pairs if p not in constraints.forbidden_paths]
    required = [p for p in constraints.required_paths if p not in constraints.forbidden_paths]
    optional = [p for p in pool if p not in required]

    specs: list[ModelSpec] = []
    seen: set = set()
    max_extra = max(0, min(constraints.max_paths - len(required), len(optional)))

    for k in range(0, max_extra + 1):
        for combo in combinations(optional, k):
            edges = list(required) + list(combo)
            if not edges and not measurement:
                continue
            # 相互パス（A→B と B→A の同時指定）は識別困難なため除外
            if any((b, a) in edges for a, b in edges):
                continue
            spec = ModelSpec(measurement=dict(measurement), regressions=edges)
            sig = spec.signature()
            if sig in seen:
                continue
            seen.add(sig)
            specs.append(spec)
            if len(specs) >= constraints.max_candidates:
                return specs
    return specs


def evaluate(results: list) -> pd.DataFrame:
    """推定済み候補（SEMResult のリスト）を比較表にまとめる。

    判断材料を列ごとに分けて示し、単一の点数で優劣を断定しない。
    """
    rows = []
    for r in results:
        if r is None:
            continue
        f = r.fit
        n_warn = len(r.diagnostics.numeric_warnings) + (0 if r.diagnostics.converged else 1)
        rows.append({
            "モデル名": r.model_name,
            "パス数": len(r.spec.regressions),
            "推定パラメータ数": f.npar,
            "χ²": round(f.chi2, 3) if np.isfinite(f.chi2) else np.nan,
            "df": f.df,
            "p値": round(f.pvalue, 4) if np.isfinite(f.pvalue) else np.nan,
            "CFI": round(f.cfi, 4) if np.isfinite(f.cfi) else np.nan,
            "TLI": round(f.tli, 4) if np.isfinite(f.tli) else np.nan,
            "RMSEA": round(f.rmsea, 4) if np.isfinite(f.rmsea) else np.nan,
            "SRMR": round(f.srmr, 4) if np.isfinite(f.srmr) else np.nan,
            "AIC": round(f.aic, 2) if np.isfinite(f.aic) else np.nan,
            "BIC": round(f.bic, 2) if np.isfinite(f.bic) else np.nan,
            "警告数": n_warn,
            "収束": "○" if r.diagnostics.converged else "×",
        })
    return pd.DataFrame(rows)


def criterion_winners(table: pd.DataFrame) -> dict:
    """指標ごとに「どのモデルを支持するか」を示す（判断材料の分離）。"""
    if table.empty:
        return {}
    winners: dict = {}
    higher_better = {"CFI", "TLI"}
    lower_better = {"RMSEA", "SRMR", "AIC", "BIC", "推定パラメータ数"}
    for col in list(higher_better | lower_better):
        if col not in table.columns:
            continue
        s = table[col].dropna()
        if s.empty:
            continue
        idx = s.idxmax() if col in higher_better else s.idxmin()
        winners[col] = str(table.loc[idx, "モデル名"])
    return winners


def summarize_disagreement(winners: dict) -> str:
    """指標間で支持するモデルが割れている場合に、その旨を明示する。"""
    if not winners:
        return "比較できる指標がありません。"
    uniq = sorted(set(winners.values()))
    if len(uniq) == 1:
        return (
            f"比較したすべての指標が「{uniq[0]}」を支持しています。"
            "ただし、これはこのモデルが理論的に正しいことや、因果関係を示すことを意味しません。"
        )
    parts = []
    for model in uniq:
        cols = [k for k, v in winners.items() if v == model]
        parts.append(f"「{model}」は {'・'.join(cols)} が支持")
    return (
        "指標によって支持するモデルが分かれています："
        + "、".join(parts)
        + "。SEM では一つの数値で優劣を決めず、複数の指標・係数・残差・理論上の意味を"
          "あわせて判断します。"
    )


def reference_score(table: pd.DataFrame) -> pd.DataFrame:
    """参考用の総合点（100点満点）。**正しさを表す点数ではない**。

    計算方法を開示するため、内訳の列も返す。
    """
    if table.empty:
        return table

    def norm(col, higher_better=True):
        if col not in table.columns:
            return pd.Series([np.nan] * len(table))
        s = table[col].astype(float)
        if s.notna().sum() == 0:
            return pd.Series([np.nan] * len(table))
        lo, hi = s.min(), s.max()
        if not np.isfinite(lo) or not np.isfinite(hi) or hi == lo:
            return pd.Series([50.0] * len(table))
        z = (s - lo) / (hi - lo)
        return (z if higher_better else (1 - z)) * 100

    out = table.copy()
    out["_適合(CFI)"] = norm("CFI", True)
    out["_適合(RMSEA)"] = norm("RMSEA", False)
    out["_適合(SRMR)"] = norm("SRMR", False)
    out["_簡潔性"] = norm("推定パラメータ数", False)
    out["_警告の少なさ"] = norm("警告数", False)
    cols = ["_適合(CFI)", "_適合(RMSEA)", "_適合(SRMR)", "_簡潔性", "_警告の少なさ"]
    out["参考総合点"] = out[cols].mean(axis=1).round(1)
    return out


SCORE_DISCLAIMER = (
    "※「参考総合点」は、CFI・RMSEA・SRMR・簡潔性（推定パラメータ数の少なさ）・"
    "警告の少なさの5項目を、候補内で0〜100に正規化して単純平均した参考値です。"
    "**この点数はモデルの正しさを表すものではありません。**"
    "点数が高いモデルが「正解」ということではなく、必ず個々の指標と理論的な妥当性を"
    "ご確認ください。"
)
