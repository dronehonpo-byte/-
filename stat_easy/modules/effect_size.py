"""④ 効果量・信頼区間の自動計算。

Cohen's d / Hedges' g / η² / partial η² / Cramer's V と、
各種 95% 信頼区間（解析的 + bootstrap）を提供する。
すべて SciPy / NumPy のみで計算（生成 AI 不使用）。
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats

from .common import interpret_effect


@dataclass
class EffectResult:
    name: str
    value: float
    ci_low: float
    ci_high: float
    interpretation: str
    comment: str = ""


def cohens_d(a, b) -> float:
    """独立2群の Cohen's d（プールされた標準偏差を使用）。"""
    a = np.asarray(a, dtype=float)
    a = a[~np.isnan(a)]
    b = np.asarray(b, dtype=float)
    b = b[~np.isnan(b)]
    n1, n2 = len(a), len(b)
    if n1 < 2 or n2 < 2:
        return np.nan
    s_pooled = np.sqrt(((n1 - 1) * a.var(ddof=1) + (n2 - 1) * b.var(ddof=1)) / (n1 + n2 - 2))
    if s_pooled == 0:
        return np.nan
    return (a.mean() - b.mean()) / s_pooled


def hedges_g(a, b) -> float:
    """小サンプル補正版 Cohen's d。"""
    d = cohens_d(a, b)
    a = np.asarray(a, dtype=float); a = a[~np.isnan(a)]
    b = np.asarray(b, dtype=float); b = b[~np.isnan(b)]
    n = len(a) + len(b)
    if n <= 2 or np.isnan(d):
        return np.nan
    correction = 1 - (3 / (4 * (n) - 9))
    return d * correction


def cohens_d_paired(a, b) -> float:
    """対応のある2群の Cohen's d（差分の標準偏差を使用）。"""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    mask = ~(np.isnan(a) | np.isnan(b))
    diff = a[mask] - b[mask]
    if len(diff) < 2 or diff.std(ddof=1) == 0:
        return np.nan
    return diff.mean() / diff.std(ddof=1)


def eta_squared(groups: list) -> float:
    """一元配置 ANOVA の η²（SS_between / SS_total）。"""
    arrays = [np.asarray(g, dtype=float) for g in groups]
    arrays = [a[~np.isnan(a)] for a in arrays]
    grand = np.concatenate(arrays)
    grand_mean = grand.mean()
    ss_total = ((grand - grand_mean) ** 2).sum()
    ss_between = sum(len(a) * (a.mean() - grand_mean) ** 2 for a in arrays)
    if ss_total == 0:
        return np.nan
    return ss_between / ss_total


def partial_eta_squared(groups: list) -> float:
    """一元配置 ANOVA の partial η²（偏イータ二乗）。

    partial η² = SS_between / (SS_between + SS_within)。
    一元配置では SS_total = SS_between + SS_within のため η² と一致するが、
    多元配置への一般化を見据えて別関数として提供する。
    """
    arrays = [np.asarray(g, dtype=float) for g in groups]
    arrays = [a[~np.isnan(a)] for a in arrays]
    grand = np.concatenate(arrays)
    grand_mean = grand.mean()
    ss_between = sum(len(a) * (a.mean() - grand_mean) ** 2 for a in arrays)
    ss_within = sum(((a - a.mean()) ** 2).sum() for a in arrays)
    denom = ss_between + ss_within
    if denom == 0:
        return np.nan
    return ss_between / denom


def cramers_v(confusion: np.ndarray) -> float:
    """カテゴリ変数の Cramer's V（バイアス補正版）。"""
    confusion = np.asarray(confusion, dtype=float)
    chi2 = stats.chi2_contingency(confusion, correction=False)[0]
    n = confusion.sum()
    if n == 0:
        return np.nan
    phi2 = chi2 / n
    r, k = confusion.shape
    phi2corr = max(0, phi2 - (k - 1) * (r - 1) / (n - 1))
    rcorr = r - (r - 1) ** 2 / (n - 1)
    kcorr = k - (k - 1) ** 2 / (n - 1)
    denom = min(kcorr - 1, rcorr - 1)
    if denom <= 0:
        return np.nan
    return np.sqrt(phi2corr / denom)


def bootstrap_ci(a, b, statistic, n_boot: int = 2000, seed: int = 42, alpha: float = 0.05):
    """2群の効果量に対する bootstrap 信頼区間（パーセンタイル法）。"""
    rng = np.random.default_rng(seed)
    a = np.asarray(a, dtype=float); a = a[~np.isnan(a)]
    b = np.asarray(b, dtype=float); b = b[~np.isnan(b)]
    if len(a) < 2 or len(b) < 2:
        return (np.nan, np.nan)
    estimates = np.empty(n_boot)
    for i in range(n_boot):
        sa = rng.choice(a, size=len(a), replace=True)
        sb = rng.choice(b, size=len(b), replace=True)
        estimates[i] = statistic(sa, sb)
    lo = np.nanpercentile(estimates, 100 * alpha / 2)
    hi = np.nanpercentile(estimates, 100 * (1 - alpha / 2))
    return (lo, hi)


def cohens_d_ci(a, b, alpha: float = 0.05):
    """Cohen's d の解析的近似信頼区間（正規近似）。"""
    a = np.asarray(a, dtype=float); a = a[~np.isnan(a)]
    b = np.asarray(b, dtype=float); b = b[~np.isnan(b)]
    n1, n2 = len(a), len(b)
    d = cohens_d(a, b)
    if np.isnan(d) or n1 < 2 or n2 < 2:
        return (np.nan, np.nan)
    se = np.sqrt((n1 + n2) / (n1 * n2) + d ** 2 / (2 * (n1 + n2)))
    z = stats.norm.ppf(1 - alpha / 2)
    return (d - z * se, d + z * se)


def two_group_effect(a, b, paired: bool = False, use_bootstrap: bool = False) -> EffectResult:
    """2群比較の効果量（Hedges' g を主指標に）をまとめて返す。"""
    if paired:
        d = cohens_d_paired(a, b)
        g = d  # 対応ありは補正を簡略化
        name = "Cohen's d (対応あり)"
    else:
        g = hedges_g(a, b)
        name = "Hedges' g"
    if use_bootstrap:
        stat_fn = (lambda x, y: cohens_d_paired(x, y)) if paired else hedges_g
        lo, hi = bootstrap_ci(a, b, stat_fn)
    else:
        lo, hi = cohens_d_ci(a, b)
    value = g
    interp = interpret_effect(value, "d")
    comment = _pval_effect_comment(interp)
    return EffectResult(name, value, lo, hi, interp, comment)


def anova_effect(groups: list) -> EffectResult:
    eta = eta_squared(groups)
    p_eta = partial_eta_squared(groups)
    omega = omega_squared(groups)
    interp = interpret_effect(eta, "eta2")
    comment = _pval_effect_comment(interp)
    extra = []
    if not np.isnan(p_eta):
        extra.append(f"partial η² = {p_eta:.3f}")
    if not np.isnan(omega):
        extra.append(f"ω² = {omega:.3f}（偏りの少ない推定）")
    if extra:
        comment += "（" + " / ".join(extra) + "）"
    res = EffectResult("η² (イータ二乗)", eta, np.nan, np.nan, interp, comment)
    res.partial_eta2 = p_eta
    res.omega2 = omega
    return res


def chi2_effect(confusion: np.ndarray) -> EffectResult:
    confusion = np.asarray(confusion, dtype=float)
    if confusion.shape == (2, 2):
        v = phi_coefficient(confusion)
        name = "φ係数 (2×2)"
    else:
        v = cramers_v(confusion)
        name = "Cramer's V"
    interp = interpret_effect(v, "cramers_v")
    return EffectResult(name, v, np.nan, np.nan, interp,
                        _pval_effect_comment(interp))


def phi_coefficient(confusion: np.ndarray) -> float:
    """2×2 分割表の φ係数。"""
    confusion = np.asarray(confusion, dtype=float)
    chi2 = stats.chi2_contingency(confusion, correction=False)[0]
    n = confusion.sum()
    if n == 0:
        return np.nan
    return np.sqrt(chi2 / n)


# ---- ノンパラ検定に対応した効果量（検定と効果量の整合性のため）----

def cliffs_delta(a, b) -> float:
    """Cliff's delta（独立2群・順位ベース）。範囲 -1〜+1。

    Mann-Whitney U 検定に対応する効果量。rank-biserial 相関と等価。
    """
    a = np.asarray(a, dtype=float); a = a[~np.isnan(a)]
    b = np.asarray(b, dtype=float); b = b[~np.isnan(b)]
    n1, n2 = len(a), len(b)
    if n1 == 0 or n2 == 0:
        return np.nan
    # rank-biserial と等価: δ = 2*U1/(n1*n2) - 1（順位法で ties も適切に処理）
    combined = np.concatenate([a, b])
    ranks = stats.rankdata(combined)
    r1 = ranks[:n1].sum()
    u1 = r1 - n1 * (n1 + 1) / 2.0
    return float(2.0 * u1 / (n1 * n2) - 1.0)


def rank_biserial_paired(a, b) -> float:
    """対応あり（Wilcoxon 符号順位検定）の rank-biserial 相関。範囲 -1〜+1。"""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    mask = ~(np.isnan(a) | np.isnan(b))
    d = a[mask] - b[mask]
    d = d[d != 0]
    if len(d) == 0:
        return np.nan
    ranks = stats.rankdata(np.abs(d))
    r_plus = ranks[d > 0].sum()
    r_minus = ranks[d < 0].sum()
    total = r_plus + r_minus
    if total == 0:
        return np.nan
    return float((r_plus - r_minus) / total)


def epsilon_squared(H: float, n: int) -> float:
    """Kruskal-Wallis 検定の ε²（イプシロン二乗）。ε² = H/(n-1)。範囲 0〜1。"""
    if n <= 1:
        return np.nan
    return float(H / (n - 1))


def omega_squared(groups: list) -> float:
    """一元配置 ANOVA の ω²（イータ二乗より偏りが小さい効果量）。"""
    arrays = [np.asarray(g, dtype=float) for g in groups]
    arrays = [a[~np.isnan(a)] for a in arrays]
    k = len(arrays)
    grand = np.concatenate(arrays)
    N = len(grand)
    if N <= k or k < 2:
        return np.nan
    grand_mean = grand.mean()
    ss_between = sum(len(a) * (a.mean() - grand_mean) ** 2 for a in arrays)
    ss_within = sum(((a - a.mean()) ** 2).sum() for a in arrays)
    ss_total = ss_between + ss_within
    ms_within = ss_within / (N - k)
    denom = ss_total + ms_within
    if denom == 0:
        return np.nan
    return float((ss_between - (k - 1) * ms_within) / denom)


def _interpret_cliffs(delta: float) -> str:
    """Cliff's delta / rank-biserial の大きさ解釈（Romano et al. 2006）。"""
    if delta is None or np.isnan(delta):
        return "—"
    a = abs(delta)
    if a < 0.147:
        return "ごく小 (negligible)"
    if a < 0.33:
        return "小 (small)"
    if a < 0.474:
        return "中 (medium)"
    return "大 (large)"


def mannwhitney_effect(a, b) -> EffectResult:
    """Mann-Whitney U 検定に対応する効果量（Cliff's delta＝rank-biserial）。"""
    delta = cliffs_delta(a, b)
    interp = _interpret_cliffs(delta)
    comment = ("順位ベースの効果量です（中央値・分布の位置の差を表します）。"
               "Mann-Whitney U 検定は平均値ではなく分布の位置を比較するため、"
               "Cohen's d ではなくこの指標を用います。")
    return EffectResult("Cliff's delta (rank-biserial)", delta, np.nan, np.nan,
                        interp, comment)


def wilcoxon_effect(a, b) -> EffectResult:
    """Wilcoxon 符号順位検定に対応する効果量（対応あり rank-biserial）。"""
    r = rank_biserial_paired(a, b)
    interp = _interpret_cliffs(r)
    comment = ("対応ありの順位ベース効果量です（差分の符号と大きさの偏りを表します）。")
    return EffectResult("matched-pairs rank-biserial", r, np.nan, np.nan,
                        interp, comment)


def kruskal_effect(H: float, n: int) -> EffectResult:
    """Kruskal-Wallis 検定に対応する効果量（ε²）。"""
    eps = epsilon_squared(H, n)
    interp = interpret_effect(eps, "eta2")
    return EffectResult("ε² (イプシロン二乗)", eps, np.nan, np.nan, interp,
                        _pval_effect_comment(interp))


def _pval_effect_comment(interp: str) -> str:
    if interp.startswith("ごく小") or interp.startswith("小"):
        return ("効果量は小さめです。p 値が有意でも、実質的な差は小さい可能性があります"
                "（サンプルサイズが大きいと小さな差でも有意になりがちです）。")
    if interp.startswith("中"):
        return "中程度の効果量です。実質的にも意味のある差と考えられます。"
    return "効果量が大きく、実質的にも明確な差があると解釈できます。"
