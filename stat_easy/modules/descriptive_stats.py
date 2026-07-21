"""② 記述統計・Table 1 自動生成。

連続変数とカテゴリ変数の記述統計、群別比較 Table（APA 形式）を生成する。
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from . import data_loader


def describe_numeric(df: pd.DataFrame, columns: list[str] | None = None) -> pd.DataFrame:
    cols = columns or data_loader.numeric_columns(df)
    rows = []
    for c in cols:
        s = df[c].dropna()
        if len(s) == 0:
            continue
        rows.append(
            {
                "変数": c,
                "N": int(s.count()),
                "平均": round(s.mean(), 3),
                "標準偏差": round(s.std(ddof=1), 3),
                "中央値": round(s.median(), 3),
                "Q1": round(s.quantile(0.25), 3),
                "Q3": round(s.quantile(0.75), 3),
                "最小": round(s.min(), 3),
                "最大": round(s.max(), 3),
                "歪度": round(stats.skew(s), 3),
                "尖度": round(stats.kurtosis(s), 3),
            }
        )
    return pd.DataFrame(rows)


def describe_categorical(df: pd.DataFrame, columns: list[str] | None = None) -> pd.DataFrame:
    cols = columns or data_loader.categorical_columns(df)
    rows = []
    for c in cols:
        s = df[c].dropna()
        n = len(s)
        if n == 0:
            continue
        vc = s.value_counts()
        for level, cnt in vc.items():
            rows.append(
                {
                    "変数": c,
                    "水準": str(level),
                    "度数": int(cnt),
                    "割合(%)": round(cnt / n * 100, 1),
                }
            )
    return pd.DataFrame(rows)


def table_one(
    df: pd.DataFrame,
    group_col: str | None = None,
    continuous: list[str] | None = None,
    categorical: list[str] | None = None,
) -> pd.DataFrame:
    """論文用 Table 1 を生成する。

    群分け変数 ``group_col`` を指定すると群別に集計し、連続変数は
    「平均 (SD)」、カテゴリ変数は「n (%)」で表す（APA 風）。
    """
    if continuous is None:
        continuous = [c for c in data_loader.numeric_columns(df) if c != group_col]
    if categorical is None:
        categorical = [c for c in data_loader.categorical_columns(df) if c != group_col]

    if group_col is None:
        groups = {"全体": df}
    else:
        groups = {str(g): sub for g, sub in df.groupby(group_col, dropna=True)}
        groups = {"全体": df, **groups}

    rows = []
    # サンプルサイズ行
    size_row = {"変数": "N (人数)"}
    for gname, gdf in groups.items():
        size_row[gname] = f"{len(gdf)}"
    rows.append(size_row)

    for c in continuous:
        row = {"変数": f"{c}（平均 ± SD）"}
        for gname, gdf in groups.items():
            s = gdf[c].dropna()
            if len(s):
                row[gname] = f"{s.mean():.2f} ± {s.std(ddof=1):.2f}"
            else:
                row[gname] = "—"
        rows.append(row)

    for c in categorical:
        levels = df[c].dropna().unique()
        rows.append({"変数": f"{c} — n (%)", **{g: "" for g in groups}})
        for lv in levels:
            row = {"変数": f"　{lv}"}
            for gname, gdf in groups.items():
                sub = gdf[c].dropna()
                n = len(sub)
                cnt = int((sub == lv).sum())
                row[gname] = f"{cnt} ({cnt / n * 100:.1f}%)" if n else "—"
            rows.append(row)

    return pd.DataFrame(rows)
