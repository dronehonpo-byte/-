"""③ 仮説検定の自動選択・実行。

群数・正規性・対応の有無・期待度数に基づいて適切な検定を自動選択し、
「なぜこの検定を選んだか」の理由（教育目的）を必ず添えて結果を返す。

すべて SciPy / statsmodels で計算（生成 AI 不使用、再現性を担保）。
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats

from . import effect_size


@dataclass
class TestResult:
    test_name: str
    reason: str  # なぜこの検定を選んだか
    statistic: float
    pvalue: float
    dof: object = None
    assumptions: dict = field(default_factory=dict)
    effect: object = None  # effect_size.EffectResult
    posthoc: object = None  # pandas.DataFrame or None
    n_groups: int = 0
    extra: dict = field(default_factory=dict)


def check_normality(values, alpha: float = 0.05) -> dict:
    """Shapiro-Wilk 検定で正規性を確認。"""
    v = np.asarray(values, dtype=float)
    v = v[~np.isnan(v)]
    if len(v) < 3:
        return {"test": "Shapiro-Wilk", "p": np.nan, "normal": False,
                "note": "サンプルが少なすぎて正規性を判定できません。"}
    if len(v) > 5000:
        v = np.random.default_rng(42).choice(v, 5000, replace=False)
    try:
        w, p = stats.shapiro(v)
    except Exception:
        return {"test": "Shapiro-Wilk", "p": np.nan, "normal": False, "note": "判定不能"}
    return {"test": "Shapiro-Wilk", "statistic": float(w), "p": float(p),
            "normal": bool(p > alpha)}


def check_equal_variance(groups, alpha: float = 0.05) -> dict:
    """Levene 検定で等分散性を確認。"""
    arrays = [np.asarray(g, dtype=float) for g in groups]
    arrays = [a[~np.isnan(a)] for a in arrays]
    arrays = [a for a in arrays if len(a) >= 2]
    if len(arrays) < 2:
        return {"test": "Levene", "p": np.nan, "equal": True, "note": "判定不能"}
    stat, p = stats.levene(*arrays)
    return {"test": "Levene", "statistic": float(stat), "p": float(p),
            "equal": bool(p > alpha)}


def compare_groups(
    df: pd.DataFrame,
    value_col: str,
    group_col: str,
    paired: bool = False,
    alpha: float = 0.05,
    use_bootstrap: bool = False,
) -> TestResult:
    """群間で連続変数を比較する。検定は自動選択する。"""
    sub = df[[value_col, group_col]].dropna()
    group_labels = list(sub[group_col].unique())
    n_groups = len(group_labels)
    if n_groups < 2:
        raise ValueError("比較するには群が2つ以上必要です。")

    groups = [sub.loc[sub[group_col] == g, value_col].to_numpy(dtype=float)
              for g in group_labels]
    for g, lab in zip(groups, group_labels):
        if len(g) < 3:
            raise ValueError(f"群『{lab}』のサンプルが少なすぎます (n={len(g)})。各群 n≥3 が必要です。")

    # 正規性は各群で判定し、全群正規なら「正規性あり」とみなす
    normality = {str(lab): check_normality(g, alpha) for lab, g in zip(group_labels, groups)}
    all_normal = all(r.get("normal") for r in normality.values())

    if n_groups == 2:
        return _two_group(groups, group_labels, normality, all_normal, paired, alpha, use_bootstrap)
    return _multi_group(groups, group_labels, sub, value_col, group_col,
                        normality, all_normal, alpha)


def _two_group(groups, labels, normality, all_normal, paired, alpha, use_bootstrap) -> TestResult:
    a, b = groups[0], groups[1]
    assumptions = {"normality": normality}

    if all_normal:
        if paired:
            n = min(len(a), len(b))
            stat, p = stats.ttest_rel(a[:n], b[:n])
            name = "対応のある t 検定 (paired t-test)"
            reason = ("2群・正規性あり（Shapiro-Wilk p>{:.2f}）・対応ありのため、"
                      "対応のある t 検定を選択しました。".format(alpha))
            dof = n - 1
        else:
            lev = check_equal_variance(groups, alpha)
            assumptions["equal_variance"] = lev
            equal = lev.get("equal", True)
            stat, p = stats.ttest_ind(a, b, equal_var=equal)
            if equal:
                name = "独立2標本 t 検定 (Student's t-test)"
                reason = ("2群・正規性あり・対応なし、かつ等分散（Levene p>{:.2f}）のため、"
                          "通常の独立2標本 t 検定を選択しました。".format(alpha))
            else:
                name = "Welch の t 検定 (不等分散)"
                reason = ("2群・正規性あり・対応なしですが、等分散性が棄却された"
                          "（Levene p≦{:.2f}）ため、Welch の t 検定を選択しました。".format(alpha))
            dof = len(a) + len(b) - 2
        # パラメトリック検定 → 平均差ベースの効果量（Cohen's d / Hedges' g）
        effect = effect_size.two_group_effect(a, b, paired=paired, use_bootstrap=use_bootstrap)
    else:
        if paired:
            n = min(len(a), len(b))
            stat, p = stats.wilcoxon(a[:n], b[:n])
            name = "Wilcoxon 符号順位検定"
            reason = ("2群・正規性なし・対応ありのため、ノンパラメトリックな"
                      "Wilcoxon 符号順位検定を選択しました。中央値・分布の位置の差を評価します。")
            dof = None
            # ノンパラ検定 → 順位ベースの効果量（Hedges' g ではない）
            effect = effect_size.wilcoxon_effect(a, b)
        else:
            stat, p = stats.mannwhitneyu(a, b, alternative="two-sided")
            name = "Mann-Whitney U 検定"
            reason = ("2群・正規性なし・対応なしのため、ノンパラメトリックな"
                      "Mann-Whitney U 検定を選択しました。平均値ではなく中央値・分布の位置を比較します。")
            dof = None
            effect = effect_size.mannwhitney_effect(a, b)

    return TestResult(
        test_name=name, reason=reason, statistic=float(stat), pvalue=float(p),
        dof=dof, assumptions=assumptions, effect=effect, n_groups=2,
        extra={"diff": _location_diff(a, b, paired)},
    )


def _multi_group(groups, labels, sub, value_col, group_col, normality, all_normal, alpha) -> TestResult:
    assumptions = {"normality": normality}
    posthoc = None
    if all_normal:
        lev = check_equal_variance(groups, alpha)
        assumptions["equal_variance"] = lev
        stat, p = stats.f_oneway(*groups)
        name = "一元配置分散分析 (one-way ANOVA)"
        reason = ("3群以上・正規性ありのため、一元配置分散分析を選択しました。"
                  "有意な場合は Tukey HSD による多重比較を行います。")
        dof = (len(groups) - 1, sum(len(g) for g in groups) - len(groups))
        if p < alpha:
            posthoc = _tukey(sub, value_col, group_col)
        effect = effect_size.anova_effect(groups)
    else:
        stat, p = stats.kruskal(*groups)
        name = "Kruskal-Wallis 検定"
        reason = ("3群以上・正規性なしのため、ノンパラメトリックな Kruskal-Wallis 検定を"
                  "選択しました。有意な場合は Dunn 検定で多重比較します。")
        dof = len(groups) - 1
        if p < alpha:
            posthoc = _dunn(groups, labels)
        # Kruskal-Wallis → ε²（イプシロン二乗）
        n_total = int(sum(len(g) for g in groups))
        effect = effect_size.kruskal_effect(float(stat), n_total)

    return TestResult(
        test_name=name, reason=reason, statistic=float(stat), pvalue=float(p),
        dof=dof, assumptions=assumptions, effect=effect, posthoc=posthoc,
        n_groups=len(groups),
    )


def group_summary(df: pd.DataFrame, value_col: str, group_col: str) -> pd.DataFrame:
    """群別の要約統計（n・平均・中央値・SD・IQR・欠損数）。結論の根拠として表示する。"""
    rows = []
    for g, sub in df.groupby(group_col, dropna=True):
        s = sub[value_col]
        valid = s.dropna()
        q1, q3 = (valid.quantile(0.25), valid.quantile(0.75)) if len(valid) else (np.nan, np.nan)
        rows.append({
            "グループ": str(g),
            "n": int(valid.count()),
            "欠損数": int(s.isna().sum()),
            "平均": round(valid.mean(), 3) if len(valid) else np.nan,
            "中央値": round(valid.median(), 3) if len(valid) else np.nan,
            "標準偏差": round(valid.std(ddof=1), 3) if len(valid) > 1 else np.nan,
            "四分位範囲(IQR)": round(q3 - q1, 3) if len(valid) else np.nan,
        })
    return pd.DataFrame(rows)


def _location_diff(a, b, paired: bool) -> dict:
    """2群の位置の差（平均差・中央値差）を返す。"""
    a = np.asarray(a, dtype=float); a = a[~np.isnan(a)]
    b = np.asarray(b, dtype=float); b = b[~np.isnan(b)]
    if len(a) == 0 or len(b) == 0:
        return {}
    return {
        "mean_diff": float(np.mean(a) - np.mean(b)),
        "median_diff": float(np.median(a) - np.median(b)),
    }


def _tukey(sub, value_col, group_col):
    from statsmodels.stats.multicomp import pairwise_tukeyhsd

    res = pairwise_tukeyhsd(sub[value_col], sub[group_col])
    return pd.DataFrame(res.summary().data[1:], columns=res.summary().data[0])


def _dunn(groups, labels):
    """Dunn 検定（Bonferroni 補正）を SciPy ベースで実装。"""
    from itertools import combinations

    all_vals = np.concatenate(groups)
    ranks = stats.rankdata(all_vals)
    n = len(all_vals)
    idx = 0
    group_ranks = []
    for g in groups:
        group_ranks.append(ranks[idx: idx + len(g)])
        idx += len(g)
    mean_ranks = [r.mean() for r in group_ranks]
    sizes = [len(g) for g in groups]

    # tie 補正
    _, counts = np.unique(all_vals, return_counts=True)
    tie_term = (counts ** 3 - counts).sum()
    sigma2 = (n * (n + 1) / 12.0) - tie_term / (12.0 * (n - 1))

    rows = []
    n_comp = len(list(combinations(range(len(groups)), 2)))
    for i, j in combinations(range(len(groups)), 2):
        diff = abs(mean_ranks[i] - mean_ranks[j])
        se = np.sqrt(sigma2 * (1 / sizes[i] + 1 / sizes[j]))
        z = diff / se if se > 0 else 0.0
        p = 2 * (1 - stats.norm.cdf(abs(z)))
        rows.append(
            {
                "群1": str(labels[i]),
                "群2": str(labels[j]),
                "z値": round(z, 3),
                "p値": round(p, 4),
                "p値(Bonferroni)": round(min(1.0, p * n_comp), 4),
                "有意(α=0.05)": "はい" if p * n_comp < 0.05 else "いいえ",
            }
        )
    return pd.DataFrame(rows)


def categorical_test(df: pd.DataFrame, col1: str, col2: str, alpha: float = 0.05) -> TestResult:
    """2つのカテゴリ変数の関連を検定（カイ二乗 / Fisher 自動選択）。

    クロス集計表・行%・列%・期待度数・標準化残差までまとめて返す。
    """
    sub = df[[col1, col2]].dropna()
    n_dropped = int(len(df) - len(sub))
    table = pd.crosstab(sub[col1], sub[col2])

    # 片方が1カテゴリしかない場合は分析不可
    if table.shape[0] < 2 or table.shape[1] < 2:
        raise ValueError(
            "少なくとも一方の項目が1カテゴリしかないため、関連の検定ができません。"
            "2カテゴリ以上ある2つの項目を選んでください。"
        )
    if (table.to_numpy() == 0).any():
        zero_note = "度数が0のセルがあります。結果の解釈に注意してください。"
    else:
        zero_note = ""

    chi2, p, dof, expected = stats.chi2_contingency(table)
    min_expected = expected.min()
    n_small = int((expected < 5).sum())
    assumptions = {"min_expected_freq": float(min_expected),
                   "table_shape": table.shape,
                   "n_cells_expected_lt5": n_small,
                   "n_dropped": n_dropped,
                   "zero_cell_note": zero_note}

    if min_expected >= 5:
        name = "カイ二乗検定 (chi-squared test)"
        reason = ("すべてのセルで期待度数が5以上のため、カイ二乗検定を選択しました。")
        stat, pval = float(chi2), float(p)
    else:
        if table.shape == (2, 2):
            odds, pval = stats.fisher_exact(table)
            name = "Fisher の正確確率検定"
            reason = ("期待度数が5未満のセルがあり（最小={:.2f}）、表が2×2のため、"
                      "Fisher の正確確率検定を選択しました。".format(min_expected))
            stat = float(odds)
        else:
            # 2×2 より大きく期待度数が小さい場合はカイ二乗（補正付き）で代替
            name = "カイ二乗検定（期待度数小・要注意）"
            reason = ("期待度数が5未満のセルがありますが、表が2×2より大きいため"
                      "カイ二乗検定で代替します。結果の解釈には注意してください。")
            stat, pval = float(chi2), float(p)

    effect = effect_size.chi2_effect(table.to_numpy())

    expected_df = pd.DataFrame(expected, index=table.index, columns=table.columns)
    row_pct = (table.div(table.sum(axis=1), axis=0) * 100).round(1)
    col_pct = (table.div(table.sum(axis=0), axis=1) * 100).round(1)
    # 標準化残差（Pearson残差）: (観測 - 期待) / sqrt(期待)
    std_resid = ((table - expected_df) / np.sqrt(expected_df)).round(2)

    return TestResult(
        test_name=name, reason=reason, statistic=stat, pvalue=pval, dof=dof,
        assumptions=assumptions, effect=effect,
        extra={
            "crosstab": table,
            "expected": expected_df,
            "row_pct": row_pct,
            "col_pct": col_pct,
            "std_resid": std_resid,
        },
    )
