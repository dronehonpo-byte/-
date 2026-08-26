"""SEM 推定エンジン（**単一の真実 / Single Source of Truth**）。

このモジュールが返す SEMResult ただ一つから、
画面表示・パス図・数値表・レポート・ダウンロード・再現コードの
**すべて**を生成する。画面ごとに別々に計算しないため、
「パス図の係数と説明の係数が違う」といった不整合が原理的に起こらない。

計算は semopy（検証済み SEM ライブラリ）と numpy/scipy のみで行い、
係数計算に生成 AI は一切使用しない。同じデータ・設定・乱数シードなら
常に同じ結果が得られる（再現性）。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd
from scipy import stats as sps

from . import fitindices
from .model_spec import ModelSpec

JST = timezone(timedelta(hours=9))


@dataclass
class Diagnostics:
    """診断は3つの段階に分けて提示する（依頼者要望）。

    1. モデルを計算できる形になっているか（識別性・定義の妥当性）
    2. 計算が正常に終了したか（収束）
    3. 得られた数値に不自然な点がないか（負の分散・相関1超 等）
    """

    spec_problems: list = field(default_factory=list)     # ①
    converged: bool = False                               # ②
    convergence_message: str = ""                         # ②
    numeric_warnings: list = field(default_factory=list)  # ③

    @property
    def has_any(self) -> bool:
        return bool(self.spec_problems) or (not self.converged) or bool(self.numeric_warnings)


@dataclass
class SEMResult:
    """1回の推定結果。すべての表示・出力はこのオブジェクトのみを参照する。"""

    model_name: str
    spec: ModelSpec
    lavaan_syntax: str
    estimator: str
    params: pd.DataFrame          # 係数表（非標準化・標準化・SE・z・p・CI）
    fit: fitindices.FitIndices    # 適合度（唯一の計算元）
    r2: pd.DataFrame              # 決定係数
    effects: pd.DataFrame         # 直接／間接／総効果（積の内訳つき）
    diagnostics: Diagnostics
    settings: dict                # 再現に必要な設定一式
    n_used: int
    n_total: int
    unused_vars: list = field(default_factory=list)
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.error is None and self.diagnostics.converged


def _to_float(x) -> float:
    """semopy の '-'（固定パラメータ）等を安全に float 化する。"""
    try:
        if x is None or (isinstance(x, str) and x.strip() in ("", "-")):
            return float("nan")
        return float(x)
    except (TypeError, ValueError):
        return float("nan")


def estimate(
    data: pd.DataFrame,
    spec: ModelSpec,
    *,
    estimator: str = "MLW",
    missing: str = "listwise",
    bootstrap: int = 0,
    seed: int = 42,
    app_version: str = "1.0.0",
) -> SEMResult:
    """モデルを推定し、単一の結果オブジェクトを返す。"""
    import semopy
    from semopy import Model, calc_stats

    diag = Diagnostics()
    diag.spec_problems = spec.validate()

    syntax = spec.to_lavaan()
    model_name = spec.derive_name()

    used_vars = [v for v in spec.all_nodes() if v in data.columns]
    unused = [c for c in data.columns if c not in used_vars]

    settings = {
        "推定法": estimator,
        "欠損値の扱い": missing,
        "ブートストラップ回数": bootstrap,
        "乱数シード": seed,
        "アプリ版": app_version,
        "semopy版": getattr(semopy, "__version__", "unknown"),
        "実行日時": datetime.now(JST).strftime("%Y-%m-%d %H:%M:%S JST"),
        "使用変数": used_vars,
    }

    n_total = int(len(data))
    work = data[used_vars].copy() if used_vars else data.copy()
    for c in work.columns:
        work[c] = pd.to_numeric(work[c], errors="coerce")
    if missing == "listwise":
        work = work.dropna()
    n_used = int(len(work))

    empty = pd.DataFrame()
    if n_used < 10 or not used_vars:
        diag.convergence_message = "有効データが少なすぎるため推定できません。"
        return SEMResult(
            model_name=model_name, spec=spec, lavaan_syntax=syntax,
            estimator=estimator, params=empty,
            fit=fitindices.compute(chi2=float("nan"), df=0, baseline_chi2=float("nan"),
                                   baseline_df=0, n_used=n_used, npar=0, srmr=float("nan")),
            r2=empty, effects=empty, diagnostics=diag, settings=settings,
            n_used=n_used, n_total=n_total, unused_vars=unused,
            error="有効データが不足しています（欠損除外後に10行未満）。",
        )

    # ---- 推定 ----
    try:
        model = Model(syntax)
        res = model.fit(work, obj=estimator)
        msg = str(getattr(res, "message", "") or res)
        diag.converged = bool(getattr(res, "success", True))
        diag.convergence_message = msg
    except Exception as exc:  # noqa: BLE001
        diag.convergence_message = str(exc)
        return SEMResult(
            model_name=model_name, spec=spec, lavaan_syntax=syntax,
            estimator=estimator, params=empty,
            fit=fitindices.compute(chi2=float("nan"), df=0, baseline_chi2=float("nan"),
                                   baseline_df=0, n_used=n_used, npar=0, srmr=float("nan")),
            r2=empty, effects=empty, diagnostics=diag, settings=settings,
            n_used=n_used, n_total=n_total, unused_vars=unused,
            error=f"推定に失敗しました：{exc}",
        )

    # ---- 係数表（唯一の係数の源泉）----
    ins = model.inspect(std_est=True)
    ins = ins.rename(columns={
        "lval": "左辺", "op": "演算子", "rval": "右辺",
        "Estimate": "非標準化係数", "Est. Std": "標準化係数",
        "Std. Err": "標準誤差", "z-value": "z値", "p-value": "p値",
    })
    for col in ("非標準化係数", "標準化係数", "標準誤差", "z値", "p値"):
        if col in ins.columns:
            ins[col] = ins[col].map(_to_float)

    # 95% 信頼区間（非標準化係数）
    z975 = sps.norm.ppf(0.975)
    ins["95%CI下限"] = ins["非標準化係数"] - z975 * ins["標準誤差"]
    ins["95%CI上限"] = ins["非標準化係数"] + z975 * ins["標準誤差"]

    # 種別ラベル（測定＝潜在→観測、構造＝回帰、分散・共分散）
    latents = set(spec.latents)

    def _kind(row) -> str:
        if row["演算子"] == "~~":
            return "分散" if row["左辺"] == row["右辺"] else "共分散"
        # semopy は負荷も回帰も '~' で表す（左辺＝結果, 右辺＝原因）
        if row["右辺"] in latents and row["左辺"] not in latents:
            return "因子負荷（潜在→観測）"
        return "パス係数（回帰）"

    ins["種別"] = ins.apply(_kind, axis=1)

    # 表示用の矢印表記（潜在→観測の向きを明示）
    ins["表記"] = ins.apply(
        lambda r: (f"{r['右辺']} → {r['左辺']}" if r["演算子"] == "~"
                   else (f"{r['左辺']} の分散" if r["左辺"] == r["右辺"]
                         else f"{r['左辺']} ↔ {r['右辺']}")),
        axis=1,
    )

    # ---- 適合度（fitindices に一元化）----
    try:
        st = calc_stats(model).T["Value"]
        chi2 = _to_float(st.get("chi2"))
        dof = int(_to_float(st.get("DoF")))
        b_chi2 = _to_float(st.get("chi2 Baseline"))
        b_dof = int(_to_float(st.get("DoF Baseline")))
    except Exception:  # noqa: BLE001
        chi2, dof, b_chi2, b_dof = float("nan"), 0, float("nan"), 0

    srmr = float("nan")
    try:
        sigma = np.asarray(model.calc_sigma()[0], dtype=float)
        obs = list(model.vars["observed"])
        # SRMR とベースラインには、欠損を除いた標本共分散を用いる
        S = np.cov(work[obs].dropna().to_numpy(dtype=float).T, ddof=1)
        srmr = fitindices.srmr_from_matrices(S, sigma)
        # 推定ライブラリのベースラインが不正な場合（FIML 使用時など）は自前で計算する
        if not (np.isfinite(b_chi2) and b_dof > 0 and b_chi2 > b_dof):
            n_base = int(len(work[obs].dropna()))
            bb, bd = fitindices.baseline_from_covariance(S, n_base)
            if np.isfinite(bb) and bd > 0:
                b_chi2, b_dof = bb, bd
    except Exception:  # noqa: BLE001
        pass

    _pv = getattr(model, "param_vals", None)
    npar = int(len(_pv)) if _pv is not None else 0
    fit = fitindices.compute(
        chi2=chi2, df=dof, baseline_chi2=b_chi2, baseline_df=b_dof,
        n_used=n_used, npar=npar, srmr=srmr,
    )

    # ---- R²（内生変数の説明率）----
    r2 = _compute_r2(model, ins, spec)

    # ---- 効果分解（直接・間接・総、積の内訳つき）----
    effects = compute_effects(ins, spec, work=work, bootstrap=bootstrap,
                              seed=seed, estimator=estimator, syntax=syntax)

    # ---- 数値の不自然さ（診断③）----
    diag.numeric_warnings = _numeric_checks(ins, fit, n_used, npar, spec)

    return SEMResult(
        model_name=model_name, spec=spec, lavaan_syntax=syntax, estimator=estimator,
        params=ins, fit=fit, r2=r2, effects=effects, diagnostics=diag,
        settings=settings, n_used=n_used, n_total=n_total, unused_vars=unused,
    )


def _compute_r2(model, ins: pd.DataFrame, spec: ModelSpec) -> pd.DataFrame:
    """内生変数の R²（1 - 残差分散 / モデル含意分散）。"""
    rows = []
    try:
        sigma = np.asarray(model.calc_sigma()[0], dtype=float)
        obs = list(model.vars["observed"])
        implied = {v: float(sigma[i, i]) for i, v in enumerate(obs)}
    except Exception:  # noqa: BLE001
        implied = {}

    endo = set()
    for _, dst in spec.regressions:
        endo.add(dst)
    endo |= set(spec.indicators)

    var_rows = ins[(ins["演算子"] == "~~") & (ins["左辺"] == ins["右辺"])]
    for _, r in var_rows.iterrows():
        v = r["左辺"]
        if v not in endo:
            continue
        resid = _to_float(r["非標準化係数"])
        tot = implied.get(v)
        if tot and np.isfinite(resid) and tot > 0:
            rows.append({"変数": v, "R²": round(1.0 - resid / tot, 4),
                         "残差分散": round(resid, 4)})
        else:
            # 標準化残差分散から求める（Est. Std が残差割合を表す）
            std_resid = _to_float(r["標準化係数"])
            if np.isfinite(std_resid):
                rows.append({"変数": v, "R²": round(1.0 - std_resid, 4),
                             "残差分散": round(resid, 4)})
    return pd.DataFrame(rows)


def compute_effects(
    ins: pd.DataFrame, spec: ModelSpec, *, work=None, bootstrap: int = 0,
    seed: int = 42, estimator: str = "MLW", syntax: str = "",
) -> pd.DataFrame:
    """直接効果・間接効果・総効果を、**積の内訳を明示して**算出する。

    どの2つ（以上）の係数を掛けたのかを文字列で示すため、
    利用者が手元で検算できる（依頼者要望）。
    """
    reg = ins[(ins["演算子"] == "~")]
    # 構造パスのみ（潜在→観測の因子負荷は効果分解から除く）
    latents = set(spec.latents)
    coef: dict = {}
    for _, r in reg.iterrows():
        src, dst = r["右辺"], r["左辺"]
        if dst in latents or (src in latents and dst in latents) or \
           (src not in latents and dst not in latents):
            # 構造モデル上のパス（潜在→潜在、観測→観測、潜在→観測の構造パス）
            pass
        if (src, dst) in [(a, b) for a, b in spec.regressions]:
            coef[(src, dst)] = _to_float(r["非標準化係数"])

    if not coef:
        return pd.DataFrame()

    nodes = spec.structural_nodes()
    rows = []
    for x in nodes:
        for y in nodes:
            if x == y:
                continue
            paths = _all_paths(coef, x, y, max_len=4)
            if not paths:
                continue
            direct = coef.get((x, y), float("nan"))
            indirect_paths = [p for p in paths if len(p) > 2]
            indirect_total = 0.0
            details = []
            for p in indirect_paths:
                prod = 1.0
                terms = []
                for a, b in zip(p[:-1], p[1:]):
                    c = coef[(a, b)]
                    prod *= c
                    terms.append(f"({a}→{b}: {c:.3f})")
                indirect_total += prod
                details.append(" × ".join(terms) + f" = {prod:.4f}")
            if not indirect_paths and not np.isfinite(direct):
                continue
            total = (0.0 if not np.isfinite(direct) else direct) + indirect_total
            rows.append({
                "説明変数": x,
                "結果変数": y,
                "直接効果": round(direct, 4) if np.isfinite(direct) else np.nan,
                "間接効果": round(indirect_total, 4) if indirect_paths else np.nan,
                "総効果": round(total, 4),
                "間接効果の内訳（掛け合わせた係数）": " ／ ".join(details) if details else "—",
            })

    df = pd.DataFrame(rows)

    # ブートストラップ信頼区間（個票データがある場合のみ）
    if bootstrap and work is not None and len(df) and syntax:
        df = _bootstrap_effects(df, spec, work, syntax, bootstrap, seed, estimator)
    return df


def _all_paths(coef: dict, start, goal, max_len: int = 4) -> list:
    """有向パスを全列挙（循環なし・長さ上限つき）。"""
    results = []

    def walk(node, path):
        if len(path) > max_len:
            return
        for (a, b) in coef:
            if a != node or b in path:
                continue
            newp = path + [b]
            if b == goal:
                results.append(newp)
            else:
                walk(b, newp)

    walk(start, [start])
    return results


def _bootstrap_effects(df, spec, work, syntax, n_boot, seed, estimator):
    """間接効果のブートストラップ信頼区間（個票データのみ）。"""
    from semopy import Model

    rng = np.random.default_rng(seed)
    keys = [(r["説明変数"], r["結果変数"]) for _, r in df.iterrows()]
    store = {k: [] for k in keys}
    n = len(work)
    for _ in range(int(n_boot)):
        idx = rng.integers(0, n, n)
        samp = work.iloc[idx]
        try:
            m = Model(syntax)
            m.fit(samp, obj=estimator)
            ii = m.inspect()
            c = {}
            for _, r in ii.iterrows():
                if r["op"] == "~" and (r["rval"], r["lval"]) in [(a, b) for a, b in spec.regressions]:
                    c[(r["rval"], r["lval"])] = _to_float(r["Estimate"])
            for (x, y) in keys:
                ps = _all_paths(c, x, y, max_len=4)
                tot = 0.0
                for p in ps:
                    if len(p) <= 2:
                        continue
                    prod = 1.0
                    for a, b in zip(p[:-1], p[1:]):
                        prod *= c.get((a, b), np.nan)
                    tot += prod
                store[(x, y)].append(tot)
        except Exception:  # noqa: BLE001
            continue

    los, his = [], []
    for (x, y) in keys:
        vals = np.array([v for v in store[(x, y)] if np.isfinite(v)])
        if len(vals) >= 20:
            los.append(round(float(np.percentile(vals, 2.5)), 4))
            his.append(round(float(np.percentile(vals, 97.5)), 4))
        else:
            los.append(np.nan)
            his.append(np.nan)
    df = df.copy()
    df["間接効果95%CI下限"] = los
    df["間接効果95%CI上限"] = his
    return df


def _numeric_checks(ins: pd.DataFrame, fit, n_used: int, npar: int, spec: ModelSpec) -> list:
    """得られた数値に不自然な点がないかを検査し、平易な日本語で返す。"""
    warns: list[str] = []

    # 負の分散（Heywood ケース）
    var_rows = ins[(ins["演算子"] == "~~") & (ins["左辺"] == ins["右辺"])]
    for _, r in var_rows.iterrows():
        est = _to_float(r["非標準化係数"])
        if np.isfinite(est) and est < 0:
            warns.append(
                f"『{r['左辺']}』の分散が負の値（{est:.3f}）になっています。"
                "これは統計的にあり得ない値で、Heywood ケースと呼ばれます。"
                "その変数の観測数・尺度・因子への割当てをご確認ください。"
            )

    # 標準化係数の絶対値が1を超える
    for _, r in ins[ins["演算子"] == "~"].iterrows():
        std = _to_float(r["標準化係数"])
        if np.isfinite(std) and abs(std) > 1.0:
            warns.append(
                f"『{r['表記']}』の標準化係数が {std:.3f} と絶対値1を超えています。"
                "モデルの識別や多重共線性に問題がある可能性があります。"
            )

    # 潜在変数間の相関が1に近い
    cov_rows = ins[(ins["演算子"] == "~~") & (ins["左辺"] != ins["右辺"])]
    lat = set(spec.latents)
    for _, r in cov_rows.iterrows():
        if r["左辺"] in lat and r["右辺"] in lat:
            std = _to_float(r["標準化係数"])
            if np.isfinite(std) and abs(std) > 0.90:
                warns.append(
                    f"潜在変数『{r['左辺']}』と『{r['右辺']}』の相関が {std:.3f} と非常に高く、"
                    "同じ概念を測っている可能性があります（弁別妥当性の問題）。"
                )

    # 標準誤差が算出できない
    n_no_se = int(ins["標準誤差"].isna().sum()) if "標準誤差" in ins else 0
    fixed = int((ins["演算子"] == "~").sum() and 0)
    if n_no_se > len(spec.latents):  # 固定負荷（各潜在1つ）を超える場合
        warns.append(
            f"標準誤差を算出できないパラメータが {n_no_se} 個あります。"
            "モデルが識別できていない可能性があります（パスや制約の見直しが必要です）。"
        )

    # 低い因子負荷
    for _, r in ins[ins["種別"] == "因子負荷（潜在→観測）"].iterrows():
        std = _to_float(r["標準化係数"])
        if np.isfinite(std) and abs(std) < 0.30:
            warns.append(
                f"『{r['表記']}』の標準化因子負荷が {std:.3f} と低めです（目安0.3〜0.4以上）。"
                "この項目が潜在変数をうまく測れていない可能性があります。"
            )

    # 標本数とパラメータ数の関係（モデル作成後に判断する）
    if npar > 0 and n_used / max(npar, 1) < 5:
        warns.append(
            f"推定するパラメータ数（{npar}）に対して有効標本数（{n_used}）が少なめです"
            f"（1パラメータあたり {n_used / npar:.1f} ケース）。"
            "一般に5〜10ケース以上が目安とされ、推定が不安定になることがあります。"
        )

    return warns
