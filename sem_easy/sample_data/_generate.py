"""検証用サンプルデータの生成（乱数シード固定で再現可能）。

依頼者要望：正常例・入力エラー例・収束不良例・順序尺度例・媒介モデル例を用意し、
期待される出力と照合できるようにする。
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
RNG = np.random.default_rng(2024)


def make_cfa_normal(n=400):
    """① 正常例：2因子 × 各3指標、因子間にパス（欠損なし・連続尺度）。"""
    f1 = RNG.normal(0, 1, n)
    f2 = 0.55 * f1 + RNG.normal(0, 0.85, n)
    d = {}
    for i in range(1, 4):
        d[f"se_0{i}"] = np.round(0.80 * f1 + RNG.normal(0, 0.60, n), 4)
    for i in range(1, 4):
        d[f"wb_0{i}"] = np.round(0.80 * f2 + RNG.normal(0, 0.60, n), 4)
    return pd.DataFrame(d)


def make_mediation(n=500):
    """② 媒介モデル例：X → M → Y ＋ X → Y（真値 a=.50, b=.40, c'=.30）。"""
    x = RNG.normal(0, 1, n)
    m = 0.50 * x + RNG.normal(0, 0.80, n)
    y = 0.40 * m + 0.30 * x + RNG.normal(0, 0.80, n)
    return pd.DataFrame({
        "研修参加度": np.round(x, 4),
        "自己効力感": np.round(m, 4),
        "業務成果": np.round(y, 4),
    })


def make_ordinal(n=450):
    """③ 順序尺度例：5件法リッカート（2因子）。"""
    f1 = RNG.normal(0, 1, n)
    f2 = 0.5 * f1 + RNG.normal(0, 0.9, n)
    def likert(latent, load=0.85):
        z = load * latent + RNG.normal(0, 0.6, n)
        # 5件法へ離散化
        qs = np.quantile(z, [0.2, 0.4, 0.6, 0.8])
        return np.digitize(z, qs) + 1
    d = {}
    for i in range(1, 4):
        d[f"q1_{i}"] = likert(f1)
    for i in range(1, 4):
        d[f"q2_{i}"] = likert(f2)
    return pd.DataFrame(d)

def make_missing(n=400):
    """④ 欠損あり例：連続尺度に約8%の欠損を混入（FIML の確認用）。"""
    df = make_cfa_normal(n)
    for c in df.columns:
        mask = RNG.random(n) < 0.08
        df.loc[mask, c] = np.nan
    return df


def make_problematic(n=60):
    """⑤ 収束不良・入力エラー例：標本が少なく、ほぼ同一の変数を含む。"""
    f = RNG.normal(0, 1, n)
    d = {}
    for i in range(1, 4):
        d[f"x_0{i}"] = np.round(0.8 * f + RNG.normal(0, 0.5, n), 4)
    # ほぼ完全相関の変数（多重共線性・識別困難の再現）
    d["x_04"] = np.round(d["x_01"] + RNG.normal(0, 0.001, n), 4)
    # 定数列（分散ゼロ）
    d["x_05"] = 3.0
    # 文字混入（入力エラー例）
    col = np.round(0.6 * f + RNG.normal(0, 0.6, n), 4).astype(object)
    col[5] = "未回答"
    col[9] = "―"
    d["x_06"] = col
    return pd.DataFrame(d)


def make_correlation_matrix():
    """⑥ 相関行列入力の例（行名・列名つき）。"""
    names = ["se_01", "se_02", "se_03", "wb_01", "wb_02", "wb_03"]
    df = make_cfa_normal(600)
    corr = df.corr().round(4)
    corr.index = names
    corr.columns = names
    return corr


def main() -> None:
    make_cfa_normal().to_csv(HERE / "sample_cfa_正常例.csv", index=False, encoding="utf-8-sig")
    make_mediation().to_csv(HERE / "sample_媒介モデル.csv", index=False, encoding="utf-8-sig")
    make_ordinal().to_csv(HERE / "sample_順序尺度_5件法.csv", index=False, encoding="utf-8-sig")
    make_missing().to_csv(HERE / "sample_欠損あり.csv", index=False, encoding="utf-8-sig")
    make_problematic().to_csv(HERE / "sample_問題データ.csv", index=False, encoding="utf-8-sig")
    make_correlation_matrix().to_csv(HERE / "sample_相関行列.csv", encoding="utf-8-sig")
    print("サンプルデータを生成しました。")


if __name__ == "__main__":
    main()
