"""サンプルデータ生成スクリプト（再現性のため乱数シード固定）。

  python sample_data/_generate.py

で 3 種類の CSV を生成する。生成済み CSV はリポジトリに含めるが、
再生成したい場合に利用する。
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
RNG = np.random.default_rng(42)


def make_experiment() -> pd.DataFrame:
    n = 200
    group = RNG.choice(["介入", "対照"], size=n, p=[0.5, 0.5])
    age = np.clip(RNG.normal(45, 12, n), 20, 80).round(0)
    gender = RNG.choice(["男性", "女性"], size=n)
    region = RNG.choice(["北海道", "東北", "関東", "中部", "近畿", "九州"], size=n)
    pre = RNG.normal(50, 10, n)
    # 介入群は post で効果（+8 程度）が出るように設定
    effect = np.where(group == "介入", 8.0, 0.5)
    post = pre + effect + RNG.normal(0, 6, n)

    df = pd.DataFrame(
        {
            "subject_id": np.arange(1, n + 1),
            "group": group,
            "age": age,
            "gender": gender,
            "pre_score": pre.round(1),
            "post_score": post.round(1),
            "region": region,
        }
    )

    # 外れ値を 2〜3 件混入
    df.loc[5, "post_score"] = 130.0
    df.loc[120, "pre_score"] = -20.0
    df.loc[77, "age"] = 150.0

    # 欠損値を約 5% 混入（id/group 以外）
    for col in ["age", "gender", "pre_score", "post_score", "region"]:
        mask = RNG.random(n) < 0.05
        df.loc[mask, col] = np.nan
    return df


def make_survey() -> pd.DataFrame:
    n = 300
    age_group = RNG.choice(["20代", "30代", "40代", "50代", "60代以上"], size=n)
    education = RNG.choice(["高校", "専門", "大学", "大学院"], size=n, p=[0.25, 0.2, 0.4, 0.15])
    data = {
        "respondent_id": np.arange(1, n + 1),
        "age_group": age_group,
        "education": education,
    }
    # q1〜q10 のリッカート（1〜5）。教育水準で少し傾向を変える
    edu_bonus = pd.Series(education).map({"高校": 0, "専門": 0, "大学": 0.4, "大学院": 0.7}).to_numpy()
    for i in range(1, 11):
        base = RNG.normal(3 + edu_bonus, 1.0)
        data[f"q{i}"] = np.clip(np.round(base), 1, 5).astype(int)
    df = pd.DataFrame(data)
    # 欠損を少量
    for i in range(1, 11):
        mask = RNG.random(n) < 0.02
        df.loc[mask, f"q{i}"] = np.nan
    return df


def main() -> None:
    make_experiment().to_csv(HERE / "sample_experiment.csv", index=False, encoding="utf-8-sig")
    make_survey().to_csv(HERE / "sample_survey.csv", index=False, encoding="utf-8-sig")
    print("サンプルデータを生成しました。")


if __name__ == "__main__":
    main()
