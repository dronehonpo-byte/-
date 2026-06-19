"""① ファイル読み込み・型判定。

CSV / Excel(.xlsx) に対応。文字コードは自動判定（chardet）。
数値列に文字が混入している場合は自動で数値化を試み、変換できない値は欠損に。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO
from typing import Optional

import numpy as np
import pandas as pd

SUPPORTED_EXTENSIONS = (".csv", ".xlsx", ".xls")

# 列の型ラベル
TYPE_NUMERIC = "数値"
TYPE_CATEGORICAL = "カテゴリ"
TYPE_DATETIME = "日付"
TYPE_TEXT = "テキスト"


@dataclass
class LoadResult:
    df: pd.DataFrame
    column_types: dict = field(default_factory=dict)
    warnings: list = field(default_factory=list)
    encoding: Optional[str] = None
    source_name: str = ""


def _detect_encoding(raw: bytes) -> str:
    try:
        import chardet

        guess = chardet.detect(raw[:200_000])
        enc = guess.get("encoding") or "utf-8"
        # 日本語環境でよくある誤判定の補正
        if enc.lower() in ("ascii",):
            enc = "utf-8"
        return enc
    except Exception:
        return "utf-8"


def read_file(file_obj, filename: str) -> pd.DataFrame:
    """アップロードファイル（またはパス）から DataFrame を読み込む。"""
    name = str(filename).lower()
    if not name.endswith(SUPPORTED_EXTENSIONS):
        raise ValueError(
            "サポートしていないファイル形式です。CSV (.csv) または Excel (.xlsx) を指定してください。"
        )

    if name.endswith(".csv"):
        if hasattr(file_obj, "read"):
            raw = file_obj.read()
            if isinstance(raw, str):
                raw = raw.encode("utf-8")
        else:  # パス文字列
            with open(file_obj, "rb") as fh:
                raw = fh.read()
        enc = _detect_encoding(raw)
        for trial in (enc, "utf-8-sig", "cp932", "utf-8"):
            try:
                df = pd.read_csv(BytesIO(raw), encoding=trial)
                enc = trial
                break
            except (UnicodeDecodeError, ValueError):
                continue
        else:  # すべて失敗した場合は置換読み込み
            df = pd.read_csv(BytesIO(raw), encoding="utf-8", encoding_errors="replace")
            enc = "utf-8(replace)"
        df.attrs["encoding"] = enc
    else:
        df = pd.read_excel(file_obj, engine="openpyxl")
        df.attrs["encoding"] = "xlsx"
    return df


def infer_column_type(series: pd.Series) -> str:
    """単一列の型を推定する。"""
    s = series.dropna()
    if len(s) == 0:
        return TYPE_TEXT

    if pd.api.types.is_datetime64_any_dtype(series):
        return TYPE_DATETIME
    if pd.api.types.is_numeric_dtype(series):
        # 少数のユニーク値しか持たない整数はカテゴリ的だが、数値として扱う
        return TYPE_NUMERIC

    # 文字列。日付として解釈できるか試す
    sample = s.astype(str).head(50)
    parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
    if parsed.notna().mean() > 0.8:
        return TYPE_DATETIME

    # 数値に変換できるか
    numeric = pd.to_numeric(s.astype(str).str.replace(",", "", regex=False), errors="coerce")
    if numeric.notna().mean() > 0.8:
        return TYPE_NUMERIC

    nunique = s.nunique()
    if nunique <= max(20, int(len(s) * 0.5)):
        return TYPE_CATEGORICAL
    return TYPE_TEXT


def clean_and_type(df: pd.DataFrame) -> LoadResult:
    """型判定と軽いクレンジング（数値列の文字混入除去・日付変換）。"""
    warnings: list[str] = []
    types: dict[str, str] = {}
    out = df.copy()

    for col in out.columns:
        t = infer_column_type(out[col])
        if t == TYPE_NUMERIC and not pd.api.types.is_numeric_dtype(out[col]):
            cleaned = pd.to_numeric(
                out[col].astype(str).str.replace(",", "", regex=False), errors="coerce"
            )
            n_bad = int(cleaned.isna().sum() - out[col].isna().sum())
            if n_bad > 0:
                warnings.append(
                    f"列『{col}』は数値列ですが、変換できない値 {n_bad} 件を欠損として除外しました。"
                )
            out[col] = cleaned
        elif t == TYPE_DATETIME and not pd.api.types.is_datetime64_any_dtype(out[col]):
            out[col] = pd.to_datetime(out[col], errors="coerce", format="mixed")
        types[col] = t

    return LoadResult(
        df=out,
        column_types=types,
        warnings=warnings,
        encoding=df.attrs.get("encoding"),
    )


def load(file_obj, filename: str) -> LoadResult:
    """読み込み + 型判定 + クレンジングを一括実行する高水準 API。"""
    df = read_file(file_obj, filename)
    result = clean_and_type(df)
    result.source_name = str(filename)
    return result


def numeric_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]


def categorical_columns(df: pd.DataFrame, max_levels: int = 30) -> list[str]:
    cols = []
    for c in df.columns:
        if pd.api.types.is_numeric_dtype(df[c]):
            continue
        if pd.api.types.is_datetime64_any_dtype(df[c]):
            continue
        if df[c].nunique(dropna=True) <= max_levels:
            cols.append(c)
    return cols
