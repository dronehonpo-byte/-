"""主要モジュールの動作テスト（python -m pytest）。"""
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from modules import (
    data_loader, data_quality, descriptive_stats, hypothesis_test,
    effect_size, correlation, ml_compare, clustering, visualizer,
)
from exporters import excel_exporter, word_exporter, pdf_exporter

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_data"


@pytest.fixture(scope="module")
def experiment():
    res = data_loader.load(str(SAMPLE_DIR / "sample_experiment.csv"), "sample_experiment.csv")
    return res.df


@pytest.fixture(scope="module")
def survey():
    res = data_loader.load(str(SAMPLE_DIR / "sample_survey.csv"), "sample_survey.csv")
    return res.df


def test_load_types(experiment):
    res = data_loader.clean_and_type(experiment)
    assert res.column_types["age"] == data_loader.TYPE_NUMERIC
    assert res.column_types["group"] == data_loader.TYPE_CATEGORICAL


def test_unsupported_extension():
    with pytest.raises(ValueError):
        data_loader.read_file(None, "bad.txt")


def test_quality(experiment):
    rep = data_quality.diagnose(experiment)
    assert rep.shape[0] == 200
    assert rep.missing["欠損率(%)"].max() > 0  # 欠損を意図的に混入済み
    assert rep.outliers["IQR外れ値"].sum() > 0  # 外れ値も混入済み


def test_descriptive(experiment):
    num = descriptive_stats.describe_numeric(experiment)
    assert "平均" in num.columns
    t1 = descriptive_stats.table_one(experiment, group_col="group")
    assert t1.shape[0] > 1


def test_hypothesis_two_group(experiment):
    res = hypothesis_test.compare_groups(experiment, "post_score", "group")
    assert res.n_groups == 2
    assert res.reason  # 選択理由が必ずある
    assert 0 <= res.pvalue <= 1
    assert res.effect is not None


def test_normality_selects_test():
    rng = np.random.default_rng(0)
    df = pd.DataFrame({
        "v": np.concatenate([rng.normal(0, 1, 40), rng.normal(1, 1, 40)]),
        "g": ["A"] * 40 + ["B"] * 40,
    })
    res = hypothesis_test.compare_groups(df, "v", "g")
    assert "t 検定" in res.test_name or "Mann" in res.test_name


def test_categorical_test(survey):
    res = hypothesis_test.categorical_test(survey, "education", "age_group")
    assert 0 <= res.pvalue <= 1
    assert res.effect.name == "Cramer's V"


def test_effect_sizes():
    a = [1, 2, 3, 4, 5, 6]
    b = [3, 4, 5, 6, 7, 8]
    d = effect_size.cohens_d(a, b)
    assert d < 0
    assert not np.isnan(effect_size.hedges_g(a, b))


def test_correlation(experiment):
    corr, pvals = correlation.correlation_matrix(experiment)
    assert corr.shape[0] == corr.shape[1]


def test_linear_regression(experiment):
    res = correlation.linear_regression(experiment, "post_score", ["pre_score", "age"])
    assert "R²" in res.fit_stats
    assert res.vif is not None


def test_logistic_regression(experiment):
    res = correlation.logistic_regression(experiment, "group", ["pre_score", "post_score", "age"])
    assert "AUC" in res.fit_stats


def test_ml_compare(experiment):
    res = ml_compare.compare(experiment, "group",
                             features=["pre_score", "post_score", "age"], k=3)
    assert res.mode == "classification"
    assert len(res.comparison) >= 2
    # 混同行列（最優秀分類モデル）が算出される
    assert res.confusion_matrix is not None
    assert len(res.confusion_labels) == 2


def test_partial_eta_squared():
    groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    pe = effect_size.partial_eta_squared(groups)
    assert 0 <= pe <= 1


def test_add_interaction(experiment):
    out = correlation.add_interaction(experiment, "age", "pre_score")
    assert "age×pre_score" in out.columns


def test_clustering(experiment):
    sug = clustering.suggest_k(experiment, features=["pre_score", "post_score", "age"])
    assert sug.suggested_k >= 2
    res = clustering.kmeans(experiment, k=sug.suggested_k,
                            features=["pre_score", "post_score", "age"])
    assert "cluster" in res.df_with_clusters.columns


def test_visualizer_png_svg(experiment):
    fig = visualizer.histogram(experiment, "age")
    png = visualizer.fig_to_bytes(fig, "png")
    svg = visualizer.fig_to_bytes(fig, "svg")
    assert png[:4] == b"\x89PNG"
    assert b"<svg" in svg[:300]


def test_japanese_font_no_tofu(experiment):
    """日本語ラベルの図で欠落グリフ（豆腐 □）が発生しないこと。"""
    import warnings

    figs = [
        visualizer.boxplot(experiment, "post_score", "group"),
        visualizer.histogram(experiment, "pre_score"),
        visualizer.violin(experiment, "age", "group"),
    ]
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        for fig in figs:
            visualizer.fig_to_bytes(fig, "png")
            visualizer.fig_to_bytes(fig, "svg")
    tofu = [w for w in caught if "missing from font" in str(w.message)]
    assert not tofu, f"豆腐（欠落グリフ）が発生: {[str(w.message) for w in tofu][:3]}"


def test_exporters(experiment):
    num = descriptive_stats.describe_numeric(experiment)
    xlsx = excel_exporter.export_tables({"記述統計": num})
    assert xlsx[:2] == b"PK"
    docx = word_exporter.export_report({"記述統計": num})
    assert docx[:2] == b"PK"
    pdf = pdf_exporter.export_report({"記述統計": num})
    assert pdf[:4] == b"%PDF"
