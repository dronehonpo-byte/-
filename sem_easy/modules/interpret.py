"""結果の日本語解説（慎重な表現）。

依頼者要望への対応：
- 解説はすべて SEMResult の値から生成する（画面の数値と説明の数値が必ず一致）。
- 「良好」「正解」といった断定を避け、目安との関係のみを述べる。
- 因果関係や「正しいモデル」を自動的に断定しない。
"""
from __future__ import annotations

import numpy as np

from . import fitindices

CAUSAL_CAVEAT = (
    "SEM の結果は、指定したモデルがデータとどの程度整合するかを示すものです。"
    "適合度が良いことは、そのモデルが唯一正しいことや、変数間に因果関係があることを"
    "証明するものではありません（同じデータに同程度あてはまる別のモデルが存在し得ます）。"
    "解釈は理論的な根拠とあわせて行ってください。"
)


def fit_summary(fit) -> str:
    """適合度の要約文（断定を避ける）。"""
    label, detail = fitindices.overall_judgement(fit)
    lines = [f"**総合的な見立て：{label}**", "", detail, ""]
    lines.append(
        f"χ²({fit.df}) = {fit.chi2:.3f}、p = {fit.pvalue:.3f}、"
        f"CFI = {fit.cfi:.3f}、TLI = {fit.tli:.3f}、"
        f"RMSEA = {fit.rmsea:.3f}（90%CI {fit.rmsea_lo:.3f}–{fit.rmsea_hi:.3f}）、"
        f"SRMR = {fit.srmr:.3f}、AIC = {fit.aic:.1f}、BIC = {fit.bic:.1f}、"
        f"分析に用いた n = {fit.n_used:,}"
    )
    return "\n".join(lines)


def index_table_rows(fit) -> list:
    """指標ごとの値・判定・目安（画面表示と数値表で共用）。"""
    items = [
        ("CFI", fit.cfi), ("TLI", fit.tli),
        ("RMSEA", fit.rmsea), ("SRMR", fit.srmr),
    ]
    rows = []
    for name, val in items:
        rows.append({
            "指標": name,
            "値": round(float(val), 4) if np.isfinite(val) else None,
            "判定": fitindices.judge_index(name, val),
            "一般的な目安": fitindices.CRITERIA[name]["note"],
        })
    rows.append({
        "指標": "χ²検定",
        "値": round(float(fit.pvalue), 4) if np.isfinite(fit.pvalue) else None,
        "判定": ("p>.05（モデルとデータのズレは統計的に有意でない）"
                if np.isfinite(fit.pvalue) and fit.pvalue > 0.05
                else "p≤.05（ズレが統計的に有意）"),
        "一般的な目安": "標本数が大きいと有意になりやすいため、この検定だけで判断しません",
    })
    return rows


def coefficient_summary(result, top: int = 5) -> str:
    """主要なパス係数の説明（数値は params から取得）。"""
    p = result.params
    if p is None or len(p) == 0:
        return "係数を算出できませんでした。"
    paths = p[p["種別"] == "パス係数（回帰）"].copy()
    if paths.empty:
        return "構造モデルのパスが指定されていません（測定モデルのみのモデルです）。"
    paths = paths.reindex(paths["標準化係数"].abs().sort_values(ascending=False).index)

    lines = []
    for _, r in paths.head(top).iterrows():
        std = r["標準化係数"]
        pv = r["p値"]
        sig = ("統計的に有意です" if np.isfinite(pv) and pv < 0.05
               else "統計的に有意とはいえません")
        direction = "正の" if np.isfinite(std) and std > 0 else "負の"
        lines.append(
            f"- **{r['表記']}**：標準化係数 {std:.3f}（p = {pv:.3f}）。"
            f"{direction}関連がみられ、{sig}。"
        )
    return "\n".join(lines)


def effects_summary(result) -> str:
    """媒介（直接・間接・総効果）の説明。積の内訳を明示する。"""
    e = result.effects
    if e is None or len(e) == 0:
        return "効果分解の対象となるパスがありません。"
    rows = e[e["間接効果"].notna()] if "間接効果" in e.columns else e.iloc[0:0]
    if rows.empty:
        return "間接効果（媒介）を伴うパスはありません。"
    lines = []
    for _, r in rows.iterrows():
        lines.append(
            f"- **{r['説明変数']} → {r['結果変数']}**："
            f"直接効果 {r['直接効果']:.3f}、間接効果 {r['間接効果']:.3f}、"
            f"総効果 {r['総効果']:.3f}。"
            f"　間接効果の内訳： {r['間接効果の内訳（掛け合わせた係数）']}"
        )
    lines.append("")
    lines.append(
        "※ 間接効果は、経路上の係数を掛け合わせた値です（上記の内訳のとおり）。"
        "総効果は「直接効果＋間接効果」です。"
    )
    return "\n".join(lines)


def diagnostics_summary(result) -> list:
    """診断を3段階に分けて返す（画面ではそれぞれ別枠で表示する）。"""
    d = result.diagnostics
    return [
        {
            "段階": "① モデルを計算できる形になっているか",
            "状態": "問題なし" if not d.spec_problems else f"確認事項 {len(d.spec_problems)} 件",
            "詳細": d.spec_problems or ["モデルの定義に問題は見つかりませんでした。"],
        },
        {
            "段階": "② 計算が正常に終了したか",
            "状態": "正常終了" if d.converged else "正常に終了していません",
            "詳細": [d.convergence_message or "—"],
        },
        {
            "段階": "③ 得られた数値に不自然な点がないか",
            "状態": "問題なし" if not d.numeric_warnings else f"注意 {len(d.numeric_warnings)} 件",
            "詳細": d.numeric_warnings or ["負の分散や1を超える標準化係数などは見つかりませんでした。"],
        },
    ]


def sample_adequacy(result) -> str:
    """標本数の妥当性は、モデル作成後に判断する（読込時に断定しない）。"""
    n, npar = result.n_used, result.fit.npar
    if npar <= 0:
        return f"分析に用いた標本数は {n:,} です。"
    ratio = n / npar
    base = (
        f"分析に用いた標本数は {n:,}、推定したパラメータ数は {npar} です"
        f"（1パラメータあたり {ratio:.1f} ケース）。"
    )
    if ratio >= 10:
        return base + "一般的な目安（1パラメータあたり10ケース程度）を満たしています。"
    if ratio >= 5:
        return base + "一般的な目安（10ケース程度）をやや下回りますが、5ケース以上は確保されています。"
    return base + (
        "一般的な目安を下回っており、推定が不安定になっている可能性があります。"
        "モデルを簡潔にする、または標本を増やすことをご検討ください。"
    )
