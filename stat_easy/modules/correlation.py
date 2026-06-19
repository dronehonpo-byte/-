"""⑤ 相関分析・回帰分析。

相関行列（Pearson/Spearman/Kendall）、線形回帰（単/重）、ロジスティック回帰、
VIF、残差診断などを statsmodels / scipy / sklearn で計算する。
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats

from . import data_loader


# ----------------------------- 相関 -----------------------------

def correlation_matrix(df: pd.DataFrame, method: str = "pearson",
                       columns: list[str] | None = None):
    """相関係数行列と p 値行列を返す。"""
    cols = columns or data_loader.numeric_columns(df)
    data = df[cols].dropna()
    corr = data.corr(method=method)

    pvals = pd.DataFrame(np.ones((len(cols), len(cols))), index=cols, columns=cols)
    for i, a in enumerate(cols):
        for j, b in enumerate(cols):
            if i >= j:
                continue
            x, y = data[a], data[b]
            if method == "pearson":
                _, p = stats.pearsonr(x, y)
            elif method == "spearman":
                _, p = stats.spearmanr(x, y)
            else:
                _, p = stats.kendalltau(x, y)
            pvals.iloc[i, j] = pvals.iloc[j, i] = p
    return corr, pvals


# --------------------------- 線形回帰 ---------------------------

@dataclass
class RegressionResult:
    kind: str
    summary_table: pd.DataFrame
    fit_stats: dict
    vif: pd.DataFrame = None
    diagnostics: dict = field(default_factory=dict)
    model: object = None
    warnings: list = field(default_factory=list)


def linear_regression(df: pd.DataFrame, y_col: str, x_cols: list[str],
                      standardize_beta: bool = True) -> RegressionResult:
    import statsmodels.api as sm
    from statsmodels.stats.stattools import durbin_watson

    data = df[[y_col] + list(x_cols)].dropna()
    y = data[y_col].astype(float)
    X = data[x_cols].astype(float)
    X_const = sm.add_constant(X)
    model = sm.OLS(y, X_const).fit()

    # 標準化係数 β
    betas = {}
    if standardize_beta:
        sy = y.std(ddof=1)
        for c in x_cols:
            sx = X[c].std(ddof=1)
            betas[c] = model.params[c] * sx / sy if sy else np.nan

    rows = []
    for name in model.params.index:
        ci = model.conf_int().loc[name]
        rows.append(
            {
                "項": name,
                "係数 B": round(model.params[name], 4),
                "標準化β": round(betas.get(name, np.nan), 4) if name != "const" else np.nan,
                "標準誤差": round(model.bse[name], 4),
                "t値": round(model.tvalues[name], 3),
                "p値": model.pvalues[name],
                "95%CI下限": round(ci[0], 4),
                "95%CI上限": round(ci[1], 4),
            }
        )
    summary_table = pd.DataFrame(rows)

    fit_stats = {
        "R²": round(model.rsquared, 4),
        "調整済みR²": round(model.rsquared_adj, 4),
        "F統計量": round(model.fvalue, 3),
        "F検定p値": model.f_pvalue,
        "AIC": round(model.aic, 2),
        "BIC": round(model.bic, 2),
        "N": int(model.nobs),
    }

    vif = compute_vif(X) if len(x_cols) > 1 else None
    warnings = []
    if vif is not None and (vif["VIF"] > 10).any():
        bad = vif.loc[vif["VIF"] > 10, "変数"].tolist()
        warnings.append(
            f"多重共線性の懸念: VIF>10 の変数があります（{', '.join(bad)}）。"
            "変数の見直し（除外・統合）を検討してください。"
        )

    diagnostics = {
        "durbin_watson": round(durbin_watson(model.resid), 3),
        "residuals": model.resid,
        "fitted": model.fittedvalues,
    }

    return RegressionResult("linear", summary_table, fit_stats, vif, diagnostics,
                            model, warnings)


def compute_vif(X: pd.DataFrame) -> pd.DataFrame:
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    import statsmodels.api as sm

    Xc = sm.add_constant(X.astype(float))
    rows = []
    for i, col in enumerate(Xc.columns):
        if col == "const":
            continue
        rows.append({"変数": col, "VIF": round(variance_inflation_factor(Xc.values, i), 3)})
    return pd.DataFrame(rows)


# ------------------------ ロジスティック回帰 ------------------------

def logistic_regression(df: pd.DataFrame, y_col: str, x_cols: list[str]) -> RegressionResult:
    import statsmodels.api as sm
    from sklearn.metrics import roc_auc_score, roc_curve, confusion_matrix

    data = df[[y_col] + list(x_cols)].dropna()
    y_raw = data[y_col]
    # 2値化（カテゴリなら最初の水準を 0 とする）
    classes = sorted(y_raw.unique(), key=lambda v: str(v))
    if len(classes) != 2:
        raise ValueError("ロジスティック回帰は2値の目的変数が必要です。")
    mapping = {classes[0]: 0, classes[1]: 1}
    y = y_raw.map(mapping).astype(int)
    X = sm.add_constant(data[x_cols].astype(float))
    model = sm.Logit(y, X).fit(disp=False)

    rows = []
    conf = model.conf_int()
    for name in model.params.index:
        coef = model.params[name]
        rows.append(
            {
                "項": name,
                "係数": round(coef, 4),
                "オッズ比": round(np.exp(coef), 4),
                "OR 95%CI下限": round(np.exp(conf.loc[name][0]), 4),
                "OR 95%CI上限": round(np.exp(conf.loc[name][1]), 4),
                "p値": model.pvalues[name],
            }
        )
    summary_table = pd.DataFrame(rows)

    prob = model.predict(X)
    auc = roc_auc_score(y, prob)
    fpr, tpr, _ = roc_curve(y, prob)
    pred = (prob >= 0.5).astype(int)
    cm = confusion_matrix(y, pred)

    fit_stats = {
        "疑似R² (McFadden)": round(model.prsquared, 4),
        "AIC": round(model.aic, 2),
        "BIC": round(model.bic, 2),
        "AUC": round(auc, 4),
        "N": int(model.nobs),
    }
    diagnostics = {
        "roc": (fpr, tpr),
        "auc": auc,
        "confusion_matrix": cm,
        "classes": classes,
        "hosmer_lemeshow": hosmer_lemeshow(y.to_numpy(), prob.to_numpy()),
    }
    return RegressionResult("logistic", summary_table, fit_stats, None, diagnostics, model)


def hosmer_lemeshow(y_true, y_prob, g: int = 10) -> dict:
    """Hosmer-Lemeshow 適合度検定。"""
    order = np.argsort(y_prob)
    y_true = np.asarray(y_true)[order]
    y_prob = np.asarray(y_prob)[order]
    n = len(y_true)
    g = min(g, max(2, n // 5))
    bins = np.array_split(np.arange(n), g)
    hl = 0.0
    for b in bins:
        if len(b) == 0:
            continue
        obs = y_true[b].sum()
        exp = y_prob[b].sum()
        n_b = len(b)
        if 0 < exp < n_b:
            hl += (obs - exp) ** 2 / (exp * (1 - exp / n_b))
    dof = max(1, g - 2)
    p = 1 - stats.chi2.cdf(hl, dof)
    return {"statistic": round(hl, 3), "dof": dof, "p": float(p)}


# ------------------------ 変数変換補助 ------------------------

def add_transformations(df: pd.DataFrame, col: str, kinds: list[str]) -> pd.DataFrame:
    """指定列に対数・二乗・平方根などの変換列を追加した DataFrame を返す。"""
    out = df.copy()
    s = out[col].astype(float)
    if "log" in kinds:
        out[f"log_{col}"] = np.log(s.where(s > 0))
    if "square" in kinds:
        out[f"sq_{col}"] = s ** 2
    if "sqrt" in kinds:
        out[f"sqrt_{col}"] = np.sqrt(s.where(s >= 0))
    return out


def add_interaction(df: pd.DataFrame, col1: str, col2: str) -> pd.DataFrame:
    """2 つの数値列の交互作用項（積）を追加した DataFrame を返す。"""
    out = df.copy()
    out[f"{col1}×{col2}"] = out[col1].astype(float) * out[col2].astype(float)
    return out


def compare_models_fit(results: dict) -> pd.DataFrame:
    """複数モデルの AIC/BIC/R² 比較表（変換前後比較用）。"""
    rows = []
    for label, res in results.items():
        rows.append(
            {
                "モデル": label,
                "R²": res.fit_stats.get("R²"),
                "調整済みR²": res.fit_stats.get("調整済みR²"),
                "AIC": res.fit_stats.get("AIC"),
                "BIC": res.fit_stats.get("BIC"),
            }
        )
    return pd.DataFrame(rows)
