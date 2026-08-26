"""変数の尺度水準の判定と、推定法・欠損処理の推奨。

依頼者要望：
- Excel 上で数値でも「すべて連続尺度」とは限らない（1〜5の選択肢は順序尺度）。
  そのため自動判定は**あくまで初期値**とし、利用者が確認・変更できるようにする。
- 推定法を勧める際は「なぜその方法か」を平易な言葉で示す。
- 使えない推定法と欠損処理の組合せは選べないようにする。
"""
from __future__ import annotations

import numpy as np
import pandas as pd

CONTINUOUS = "連続尺度"
ORDINAL = "順序尺度"
BINARY = "二値"
UNUSABLE = "分析に使えない"

# 推定法の定義（semopy の目的関数名と、平易な説明）
ESTIMATORS = {
    "MLW": {
        "label": "最尤法（ML）",
        "for": "連続尺度がそろっている場合の標準的な方法です。",
        "missing": ["listwise"],
    },
    "FIML": {
        "label": "完全情報最尤法（FIML）",
        "for": "連続尺度で欠損値がある場合に、データを捨てずに推定できる方法です。",
        "missing": ["fiml"],
    },
    "DWLS": {
        "label": "対角重み付き最小二乗法（DWLS／WLSMV系）",
        "for": "順序尺度や二値の変数を含む場合に適した方法です。",
        "missing": ["listwise"],
    },
    "ULS": {
        "label": "重み付けなし最小二乗法（ULS）",
        "for": "標本数が少ない場合などの代替手段です。",
        "missing": ["listwise"],
    },
}

MISSING_METHODS = {
    "listwise": "欠損のある行を除外（完全ケース分析）",
    "fiml": "欠損を除外せず推定に用いる（FIML）",
}


def detect_scale(series: pd.Series, ordinal_max_levels: int = 7) -> str:
    """1変数の尺度水準を推定する（初期値。利用者が変更可能）。"""
    s = pd.to_numeric(series, errors="coerce").dropna()
    if len(s) == 0:
        return UNUSABLE
    uniq = np.unique(s.to_numpy())
    k = len(uniq)
    if k <= 1:
        return UNUSABLE
    if k == 2:
        return BINARY
    # 整数値のみ、かつ水準数が少ない → 順序尺度とみなす
    is_int_like = np.allclose(uniq, np.round(uniq))
    if is_int_like and k <= ordinal_max_levels:
        return ORDINAL
    return CONTINUOUS


def detect_all(df: pd.DataFrame, ordinal_max_levels: int = 7) -> pd.DataFrame:
    """全変数の尺度水準と基礎情報の一覧（利用者が確認・変更するための表）。"""
    rows = []
    for c in df.columns:
        s = pd.to_numeric(df[c], errors="coerce")
        valid = s.dropna()
        uniq = np.unique(valid.to_numpy()) if len(valid) else np.array([])
        rows.append({
            "変数": c,
            "推定された尺度": detect_scale(df[c], ordinal_max_levels),
            "水準数": int(len(uniq)),
            "最小": round(float(valid.min()), 3) if len(valid) else np.nan,
            "最大": round(float(valid.max()), 3) if len(valid) else np.nan,
            "欠損数": int(s.isna().sum()),
            "欠損率(%)": round(float(s.isna().mean() * 100), 1),
        })
    return pd.DataFrame(rows)


def recommend(scales: dict, has_missing: bool) -> dict:
    """尺度構成と欠損の有無から推定法・欠損処理を推奨し、理由を返す。

    戻り値: {estimator, missing, reason, alternatives}
    """
    kinds = set(scales.values())
    non_continuous = {ORDINAL, BINARY} & kinds

    if non_continuous:
        est = "DWLS"
        miss = "listwise"
        names = "・".join(sorted(non_continuous))
        reason = (
            f"分析に使う変数の中に{names}が含まれているためです。"
            "順序尺度や二値の回答（例：1〜5の選択肢、はい／いいえ）は、"
            "間隔が等しい連続量とは限りません。これらを連続量として扱うと、"
            "係数や適合度がゆがむことがあります。"
            f"そこで、順序・二値に対応した「{ESTIMATORS[est]['label']}」を推奨します。"
        )
        if has_missing:
            reason += (
                "　なお、この推定法は欠損値をそのまま扱えないため、"
                "欠損のある行は除外して計算します（完全ケース分析）。"
            )
    elif has_missing:
        est = "FIML"
        miss = "fiml"
        reason = (
            "分析に使う変数がすべて連続尺度で、かつ欠損値があるためです。"
            f"「{ESTIMATORS[est]['label']}」は、欠損のある行をまるごと捨てずに、"
            "得られている情報を活かして推定できるため、標本を無駄にせずに済みます。"
        )
    else:
        est = "MLW"
        miss = "listwise"
        reason = (
            "分析に使う変数がすべて連続尺度で、欠損値もないためです。"
            f"この場合は標準的な「{ESTIMATORS[est]['label']}」が適しています。"
        )

    return {
        "estimator": est,
        "missing": miss,
        "reason": reason,
        "alternatives": valid_combinations(),
    }


def valid_combinations() -> list:
    """選択可能な（推定法, 欠損処理）の組合せのみを返す。

    使えない組合せ（例：DWLS × FIML）は最初から選べないようにする。
    """
    out = []
    for est, meta in ESTIMATORS.items():
        for miss in meta["missing"]:
            out.append({
                "estimator": est,
                "estimator_label": meta["label"],
                "missing": miss,
                "missing_label": MISSING_METHODS[miss],
            })
    return out


def is_valid_combination(estimator: str, missing: str) -> bool:
    meta = ESTIMATORS.get(estimator)
    return bool(meta) and missing in meta["missing"]


def explain_estimator(estimator: str) -> str:
    meta = ESTIMATORS.get(estimator)
    if not meta:
        return ""
    return f"{meta['label']}：{meta['for']}"
