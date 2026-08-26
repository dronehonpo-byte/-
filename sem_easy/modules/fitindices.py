"""適合度指標の統一計算。

**単一の真実（Single Source of Truth）の一部**：
適合度は必ずこのモジュールだけで計算し、画面・数値表・レポート・再現コードは
すべてここで作られた同一の値を参照する（画面ごとに別の値が出ることを防ぐ）。

計算はすべて numpy / scipy による明示的な数式で行い、生成 AI は一切使用しない。
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict

import numpy as np
from scipy import stats as sps


@dataclass
class FitIndices:
    """モデル全体の適合度。論文報告に必要な指標を網羅する。"""

    n_used: int
    npar: int
    chi2: float
    df: int
    pvalue: float
    cfi: float
    tli: float
    rmsea: float
    rmsea_lo: float
    rmsea_hi: float
    rmsea_pclose: float
    srmr: float
    aic: float
    bic: float
    loglik: float
    baseline_chi2: float
    baseline_df: int

    def as_dict(self) -> dict:
        return asdict(self)


def _ncp_bound(chi2: float, df: int, quantile: float) -> float:
    """非心カイ二乗分布から非心度パラメータの信頼限界を二分探索で求める。"""
    if df <= 0:
        return 0.0
    lo, hi = 0.0, max(chi2 * 4.0, 200.0)
    # cdf は非心度について単調減少
    if sps.ncx2.cdf(chi2, df, lo) < quantile:
        return 0.0
    for _ in range(200):
        mid = (lo + hi) / 2.0
        if sps.ncx2.cdf(chi2, df, mid) > quantile:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0


def rmsea_ci(chi2: float, df: int, n: int, level: float = 0.90) -> tuple[float, float]:
    """RMSEA の信頼区間（既定 90%）。"""
    if df <= 0 or n <= 1:
        return (float("nan"), float("nan"))
    alpha = (1.0 - level) / 2.0
    lam_lo = _ncp_bound(chi2, df, 1.0 - alpha)
    lam_hi = _ncp_bound(chi2, df, alpha)
    denom = df * (n - 1)
    return (float(np.sqrt(lam_lo / denom)), float(np.sqrt(lam_hi / denom)))


def rmsea_pclose(chi2: float, df: int, n: int, thresh: float = 0.05) -> float:
    """H0: RMSEA <= .05 の検定（p-close）。"""
    if df <= 0 or n <= 1:
        return float("nan")
    lam0 = (thresh ** 2) * df * (n - 1)
    return float(1.0 - sps.ncx2.cdf(chi2, df, lam0))


def srmr_from_matrices(S: np.ndarray, sigma: np.ndarray) -> float:
    """標準化残差平方平均平方根（SRMR）。

    標本共分散 S とモデル含意共分散 sigma をそれぞれ相関行列化し、
    下三角（対角含む）の残差の二乗平均の平方根を返す。
    """
    S = np.asarray(S, dtype=float)
    sigma = np.asarray(sigma, dtype=float)
    ds = np.sqrt(np.diag(S))
    dm = np.sqrt(np.diag(sigma))
    if np.any(ds <= 0) or np.any(dm <= 0):
        return float("nan")
    Rs = S / np.outer(ds, ds)
    Rm = sigma / np.outer(dm, dm)
    idx = np.tril_indices(S.shape[0], 0)
    return float(np.sqrt(np.mean((Rs[idx] - Rm[idx]) ** 2)))


def baseline_from_covariance(S: np.ndarray, n: int) -> tuple[float, int]:
    """独立モデル（すべての共分散を0と仮定）の χ² と自由度を計算する。

    最尤法の適合関数 F = log|D| - log|S|（D は S の対角行列）から求める。
    推定ライブラリ側のベースラインが不正な場合（欠損データ使用時など）に用いる。
    """
    S = np.asarray(S, dtype=float)
    p = S.shape[0]
    d = np.diag(S)
    if p < 2 or n <= 1 or np.any(d <= 0):
        return float("nan"), 0
    sign, logdet_S = np.linalg.slogdet(S)
    if sign <= 0 or not np.isfinite(logdet_S):
        return float("nan"), 0
    f_base = float(np.sum(np.log(d)) - logdet_S)
    chi2_base = max(f_base, 0.0) * (n - 1)
    df_base = p * (p - 1) // 2
    return float(chi2_base), int(df_base)


def compute(
    *,
    chi2: float,
    df: int,
    baseline_chi2: float,
    baseline_df: int,
    n_used: int,
    npar: int,
    srmr: float,
    loglik: float | None = None,
) -> FitIndices:
    """適合度指標を一括計算する。すべての画面はこの戻り値のみを参照する。"""
    chi2 = float(chi2)
    df = int(df)
    n = int(n_used)

    pvalue = float(1.0 - sps.chi2.cdf(chi2, df)) if df > 0 else float("nan")

    # CFI / TLI（ベースラインは独立モデル）
    d_model = max(chi2 - df, 0.0)
    d_base = max(baseline_chi2 - baseline_df, 0.0)
    cfi = 1.0 - (d_model / d_base) if d_base > 0 else float("nan")
    cfi = float(min(max(cfi, 0.0), 1.0)) if np.isfinite(cfi) else float("nan")

    if df > 0 and baseline_df > 0 and baseline_chi2 / baseline_df != 1.0:
        tli = ((baseline_chi2 / baseline_df) - (chi2 / df)) / (
            (baseline_chi2 / baseline_df) - 1.0
        )
        tli = float(tli)
    else:
        tli = float("nan")

    rmsea = float(np.sqrt(d_model / (df * (n - 1)))) if df > 0 and n > 1 else float("nan")
    lo, hi = rmsea_ci(chi2, df, n)
    pclose = rmsea_pclose(chi2, df, n)

    # AIC/BIC は対数尤度が得られる場合は標準式、無い場合は χ² ベースの相対値
    if loglik is not None and np.isfinite(loglik):
        aic = float(-2.0 * loglik + 2.0 * npar)
        bic = float(-2.0 * loglik + npar * np.log(n))
    else:
        aic = float(chi2 + 2.0 * npar)
        bic = float(chi2 + npar * np.log(n))
        loglik = float("nan")

    return FitIndices(
        n_used=n, npar=int(npar), chi2=chi2, df=df, pvalue=pvalue,
        cfi=cfi, tli=tli, rmsea=rmsea, rmsea_lo=lo, rmsea_hi=hi,
        rmsea_pclose=pclose, srmr=float(srmr), aic=aic, bic=bic,
        loglik=float(loglik), baseline_chi2=float(baseline_chi2),
        baseline_df=int(baseline_df),
    )


# ---- 指標の判定（断定を避けた慎重な表現：依頼者要望）----

# 一般に用いられる「目安」。これは合否判定ではなく参考値である。
CRITERIA = {
    "CFI": {"good": lambda v: v >= 0.95, "marginal": lambda v: v >= 0.90,
            "note": "0.95以上が一つの目安、0.90以上で境界的とされることが多い"},
    "TLI": {"good": lambda v: v >= 0.95, "marginal": lambda v: v >= 0.90,
            "note": "0.95以上が一つの目安、0.90以上で境界的とされることが多い"},
    "RMSEA": {"good": lambda v: v <= 0.06, "marginal": lambda v: v <= 0.08,
              "note": "0.06以下が一つの目安、0.08以下で境界的とされることが多い"},
    "SRMR": {"good": lambda v: v <= 0.08, "marginal": lambda v: v <= 0.10,
             "note": "0.08以下が一つの目安"},
}

LABEL_GOOD = "目安を満たしている"
LABEL_MARGINAL = "境界的である"
LABEL_POOR = "目安を満たしていない"
LABEL_NA = "算出できない"


def judge_index(name: str, value: float) -> str:
    """個々の指標の判定ラベル。『良好』と断定せず、目安との関係のみを述べる。"""
    if value is None or not np.isfinite(value):
        return LABEL_NA
    c = CRITERIA.get(name)
    if c is None:
        return LABEL_NA
    if c["good"](value):
        return LABEL_GOOD
    if c["marginal"](value):
        return LABEL_MARGINAL
    return LABEL_POOR


def overall_judgement(fit: FitIndices) -> tuple[str, str]:
    """モデル全体の総合ラベルと説明文。

    一つの数値で良し悪しを断定せず、指標が割れている場合は
    「指標によって判断が分かれている」と明示する（依頼者要望）。
    """
    pairs = [
        ("CFI", fit.cfi), ("TLI", fit.tli),
        ("RMSEA", fit.rmsea), ("SRMR", fit.srmr),
    ]
    labels = [judge_index(k, v) for k, v in pairs if np.isfinite(v)]
    if not labels:
        return LABEL_NA, "適合度指標を算出できませんでした。"

    n_good = labels.count(LABEL_GOOD)
    n_poor = labels.count(LABEL_POOR)
    n_marg = labels.count(LABEL_MARGINAL)

    if n_good == len(labels):
        return (
            "主要指標はいずれも目安を満たしている",
            "主要な適合度指標は、いずれも一般的な目安を満たしています。"
            "ただし適合度が良いことは、モデルが理論的に正しいことや"
            "因果関係を示すことを意味しません。係数・残差・理論的な妥当性と"
            "あわせてご判断ください。",
        )
    if n_poor == len(labels):
        return (
            "主要指標は目安を満たしていない",
            "主要な適合度指標は、いずれも一般的な目安を下回っています。"
            "モデルの構造（因子構成やパスの設定）を見直す余地があります。",
        )
    if n_good > 0 and n_poor > 0:
        return (
            "指標によって判断が分かれている",
            "目安を満たす指標と満たさない指標が混在しています。"
            "SEM では一つの数値だけで良し悪しを決めず、複数の指標・係数・残差・"
            "理論上の意味をあわせて判断します。個々の指標をご確認ください。",
        )
    if n_marg > 0:
        return (
            "境界的である",
            "主要な適合度指標は、目安の境界付近にあります。"
            "他の指標や係数の妥当性とあわせて慎重にご判断ください。",
        )
    return (
        "一部の指標が目安を満たしていない",
        "指標ごとに結果が異なります。個々の指標をご確認ください。",
    )
