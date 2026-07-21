"""① データ品質診断。

欠損値レポート、外れ値候補検出（IQR / Z-score）、重複行検出、
有効サンプルサイズ、データ形状サマリーを提供する。
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import data_loader


@dataclass
class QualityReport:
    shape: tuple
    missing: pd.DataFrame
    outliers: pd.DataFrame
    n_duplicates: int
    duplicate_rows: pd.DataFrame
    column_types: dict
    valid_n: int
    high_missing_cols: list = field(default_factory=list)
    severity: dict = field(default_factory=dict)


def missing_report(df: pd.DataFrame) -> pd.DataFrame:
    n = len(df)
    miss = df.isna().sum()
    rep = pd.DataFrame(
        {
            "列名": miss.index,
            "欠損数": miss.values,
            "欠損率(%)": (miss.values / n * 100).round(1) if n else 0,
            "有効数": n - miss.values,
        }
    ).reset_index(drop=True)
    return rep


def detect_outliers(
    df: pd.DataFrame, iqr_k: float = 1.5, z_thresh: float = 3.0
) -> pd.DataFrame:
    """数値列ごとに IQR 法・Z-score 法で外れ値候補件数を集計。"""
    rows = []
    for col in data_loader.numeric_columns(df):
        s = df[col].dropna()
        if len(s) < 4:
            rows.append({"列名": col, "IQR外れ値": 0, "Zスコア外れ値": 0,
                         "下限": np.nan, "上限": np.nan})
            continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        low, high = q1 - iqr_k * iqr, q3 + iqr_k * iqr
        iqr_out = int(((s < low) | (s > high)).sum())

        std = s.std(ddof=0)
        if std > 0:
            z = (s - s.mean()) / std
            z_out = int((z.abs() > z_thresh).sum())
        else:
            z_out = 0

        rows.append(
            {
                "列名": col,
                "IQR外れ値": iqr_out,
                "Zスコア外れ値": z_out,
                "下限": round(low, 3),
                "上限": round(high, 3),
            }
        )
    return pd.DataFrame(rows)


def outlier_mask(series: pd.Series, iqr_k: float = 1.5) -> pd.Series:
    """IQR 法による外れ値の真偽マスク（可視化や除外に利用）。"""
    s = series.dropna()
    if len(s) < 4:
        return pd.Series(False, index=series.index)
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    low, high = q1 - iqr_k * iqr, q3 + iqr_k * iqr
    return (series < low) | (series > high)


def diagnose(
    df: pd.DataFrame,
    column_types: dict | None = None,
    iqr_k: float = 1.5,
    z_thresh: float = 3.0,
    high_missing_threshold: float = 50.0,
) -> QualityReport:
    if column_types is None:
        column_types = {c: data_loader.infer_column_type(df[c]) for c in df.columns}

    miss = missing_report(df)
    out = detect_outliers(df, iqr_k=iqr_k, z_thresh=z_thresh)
    dup_mask = df.duplicated(keep="first")
    n_dup = int(dup_mask.sum())
    valid_n = int((~df.isna().any(axis=1)).sum())

    high_missing = miss.loc[miss["欠損率(%)"] > high_missing_threshold, "列名"].tolist()

    # 列ごとの信号色（赤/黄/緑）
    severity = {}
    for _, r in miss.iterrows():
        rate = r["欠損率(%)"]
        if rate > high_missing_threshold:
            severity[r["列名"]] = "bad"
        elif rate > 10:
            severity[r["列名"]] = "warn"
        else:
            severity[r["列名"]] = "ok"

    return QualityReport(
        shape=df.shape,
        missing=miss,
        outliers=out,
        n_duplicates=n_dup,
        duplicate_rows=df[dup_mask],
        column_types=column_types,
        valid_n=valid_n,
        high_missing_cols=high_missing,
        severity=severity,
    )


def missing_hint(rate: float) -> str:
    """欠損率に応じた対処ヒント（教育的説明）。"""
    if rate == 0:
        return "欠損はありません。"
    if rate < 5:
        return "欠損は少量です。リストワイズ削除（該当行除外）で概ね問題ありません。"
    if rate < 20:
        return "中程度の欠損です。平均値・中央値補完や多重代入の検討余地があります。"
    if rate <= 50:
        return "欠損が多めです。補完手法の選択がバイアスに影響します。慎重に。"
    return "欠損が50%を超えています。この変数の利用可否を再検討してください。"
