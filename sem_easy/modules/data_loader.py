"""データ読込と入力検査。

対応する入力方式（依頼者要望）：
 ① 個票データ（CSV / Excel）
 ② 相関行列（行名・列名つき ＋ 標本数 N）
 ③ 共分散行列（行名・列名つき ＋ 標本数 N）

文字コード・小数点・空欄・重複変数名などを自動検査し、
問題がある場合は「どこを、どう直せばよいか」を具体的に示す。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO

import numpy as np
import pandas as pd

INDIVIDUAL = "個票データ"
CORRELATION = "相関行列"
COVARIANCE = "共分散行列"

SUPPORTED = (".csv", ".xlsx", ".xls")


@dataclass
class LoadResult:
    kind: str                       # 個票データ / 相関行列 / 共分散行列
    data: pd.DataFrame              # 個票 or 行列
    n: int                          # 標本数（行列入力では利用者が指定）
    encoding: str | None = None
    problems: list = field(default_factory=list)   # 分析前に直すべき点
    notices: list = field(default_factory=list)    # 参考情報
    source_name: str = ""


def _detect_encoding(raw: bytes) -> str:
    try:
        import chardet

        enc = (chardet.detect(raw[:200_000]) or {}).get("encoding") or "utf-8"
        return "utf-8" if enc.lower() == "ascii" else enc
    except Exception:  # noqa: BLE001
        return "utf-8"


def read_table(file_obj, filename: str) -> tuple[pd.DataFrame, str]:
    """CSV / Excel を読み込む（文字コード自動判定）。"""
    name = str(filename).lower()
    if not name.endswith(SUPPORTED):
        raise ValueError(
            "対応していないファイル形式です。CSV（.csv）または Excel（.xlsx）をご利用ください。"
        )
    if name.endswith(".csv"):
        raw = file_obj.read() if hasattr(file_obj, "read") else open(file_obj, "rb").read()
        if isinstance(raw, str):
            raw = raw.encode("utf-8")
        enc = _detect_encoding(raw)
        for trial in (enc, "utf-8-sig", "cp932", "utf-8"):
            try:
                return pd.read_csv(BytesIO(raw), encoding=trial), trial
            except (UnicodeDecodeError, ValueError):
                continue
        return pd.read_csv(BytesIO(raw), encoding="utf-8", encoding_errors="replace"), "utf-8(置換)"
    return pd.read_excel(file_obj, engine="openpyxl"), "xlsx"


def load_individual(file_obj, filename: str) -> LoadResult:
    """個票データを読み込み、検査する。"""
    df, enc = read_table(file_obj, filename)
    problems: list[str] = []
    notices: list[str] = []

    # 重複した変数名
    dup = [c for c in df.columns[df.columns.duplicated()]]
    if dup:
        problems.append(
            f"変数名が重複しています：{', '.join(map(str, set(dup)))}。"
            "列名を一意にしてから読み込んでください。"
        )
    # 空の列名
    blank = [str(c) for c in df.columns if str(c).strip() == "" or str(c).startswith("Unnamed")]
    if blank:
        notices.append(f"列名が空欄の列があります：{', '.join(blank)}。分析対象から外すことをご検討ください。")

    # 数値化できない列（文字が混入）
    for c in df.columns:
        if df[c].dtype == object:
            conv = pd.to_numeric(df[c], errors="coerce")
            ratio = conv.notna().mean()
            if 0 < ratio < 1:
                bad = int((conv.isna() & df[c].notna()).sum())
                notices.append(
                    f"列『{c}』に数値化できない値が {bad} 件あります"
                    "（全角数字・単位・記号などが混じっていないかご確認ください）。"
                )

    if len(df) == 0:
        problems.append("データが空です。")

    return LoadResult(kind=INDIVIDUAL, data=df, n=int(len(df)), encoding=enc,
                      problems=problems, notices=notices, source_name=str(filename))


def load_matrix(file_obj, filename: str, kind: str, n: int) -> LoadResult:
    """相関行列・共分散行列を読み込み、検査する（1列目を行名とみなす）。"""
    df, enc = read_table(file_obj, filename)
    problems: list[str] = []
    notices: list[str] = []

    # 1列目を行名に
    if df.shape[1] < 2:
        raise ValueError("行列として読み込めません。1列目に変数名、2列目以降に数値を並べてください。")
    df = df.set_index(df.columns[0])
    df.index = [str(i).strip() for i in df.index]
    df.columns = [str(c).strip() for c in df.columns]

    mat = df.apply(pd.to_numeric, errors="coerce")

    if list(mat.index) != list(mat.columns):
        problems.append(
            "行名と列名が一致していません。"
            f"行：{list(mat.index)[:5]}… 列：{list(mat.columns)[:5]}…"
        )
    if mat.shape[0] != mat.shape[1]:
        problems.append(f"正方行列ではありません（{mat.shape[0]}行 × {mat.shape[1]}列）。")
    if mat.isna().any().any():
        problems.append("行列に数値でないセル（空欄・文字）が含まれています。")

    arr = mat.to_numpy(dtype=float)
    if arr.shape[0] == arr.shape[1] and not np.isnan(arr).any():
        if not np.allclose(arr, arr.T, atol=1e-6):
            problems.append("行列が対称ではありません（上三角と下三角の値が一致していません）。")
        if kind == CORRELATION and not np.allclose(np.diag(arr), 1.0, atol=1e-6):
            problems.append("相関行列の対角成分が 1 になっていません。")
        # 正定値性
        try:
            eig = np.linalg.eigvalsh((arr + arr.T) / 2)
            if np.min(eig) <= 0:
                problems.append(
                    f"行列が正定値ではありません（最小固有値 {np.min(eig):.4f}）。"
                    "このままでは推定できないことがあります。入力値をご確認ください。"
                )
        except Exception:  # noqa: BLE001
            pass

    if n is None or int(n) <= 1:
        problems.append("標本数（N）を1より大きい整数で指定してください。行列入力では N が必須です。")

    notices.append(
        "行列入力では、欠損処理が済んだ行列を前提とします。"
        "また、個票が無いためブートストラップによる間接効果の信頼区間は算出できません。"
    )

    return LoadResult(kind=kind, data=mat, n=int(n or 0), encoding=enc,
                      problems=problems, notices=notices, source_name=str(filename))


def numeric_columns(df: pd.DataFrame) -> list:
    return [c for c in df.columns if pd.api.types.is_numeric_dtype(pd.to_numeric(df[c], errors="coerce"))]


def sample_size_statement(n: int) -> str:
    """標本数は読込時点で「十分」と断定せず、事実のみを述べる（依頼者要望）。"""
    return (
        f"読み込んだデータの標本数は {n:,} です。"
        "必要な標本数は、作成するモデルの複雑さ・推定するパラメータ数・欠損の量によって変わります。"
        "十分かどうかは、モデルを作成したあとの推定結果（診断）でご確認ください。"
    )
