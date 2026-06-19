"""⑦ クラスタリング。

k-means（Elbow + シルエットでクラスタ数提示）、階層的クラスタリング、
PCA 2 次元散布図を提供する。すべて scikit-learn / scipy で計算。
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import data_loader

HIER_WARN_THRESHOLD = 5_000
HIER_SAMPLE_N = 3_000


@dataclass
class ClusterSuggestion:
    k_values: list
    inertia: list
    silhouette: list
    suggested_k: int


@dataclass
class ClusterResult:
    labels: np.ndarray
    df_with_clusters: pd.DataFrame
    cluster_summary: pd.DataFrame
    pca_coords: np.ndarray = None
    pca_explained: tuple = None
    extra: dict = field(default_factory=dict)


def _prepare(df: pd.DataFrame, features: list[str] | None):
    feats = features or data_loader.numeric_columns(df)
    data = df[feats].dropna()
    return data, feats


def suggest_k(df: pd.DataFrame, features: list[str] | None = None,
             k_range=range(2, 11)) -> ClusterSuggestion:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score

    data, feats = _prepare(df, features)
    X = StandardScaler().fit_transform(data)

    inertia, sil, ks = [], [], []
    for k in k_range:
        if k >= len(X):
            continue
        km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
        inertia.append(km.inertia_)
        sil.append(silhouette_score(X, km.labels_))
        ks.append(k)
    suggested = ks[int(np.argmax(sil))] if sil else 2
    return ClusterSuggestion(ks, inertia, sil, suggested)


def kmeans(df: pd.DataFrame, k: int, features: list[str] | None = None,
          run_pca: bool = True) -> ClusterResult:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    data, feats = _prepare(df, features)
    scaler = StandardScaler()
    X = scaler.fit_transform(data)
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
    labels = km.labels_

    out = data.copy()
    out["cluster"] = labels
    summary = out.groupby("cluster")[feats].mean().round(3)
    summary.insert(0, "件数", out.groupby("cluster").size())

    coords, explained = (None, None)
    if run_pca and X.shape[1] >= 2:
        coords, explained = _pca2d(X)

    return ClusterResult(labels, out, summary.reset_index(), coords, explained,
                         extra={"features": feats})


def hierarchical(df: pd.DataFrame, k: int, method: str = "ward",
                features: list[str] | None = None, auto_sample: bool = True) -> ClusterResult:
    from scipy.cluster.hierarchy import linkage, fcluster
    from sklearn.preprocessing import StandardScaler

    data, feats = _prepare(df, features)
    warnings = []
    if len(data) > HIER_WARN_THRESHOLD and auto_sample:
        warnings.append(
            f"行数が {len(data):,} と多いため、{HIER_SAMPLE_N:,}行にランダムサンプリングして実行しました。"
            "大規模データでは k-means を推奨します。"
        )
        data = data.sample(HIER_SAMPLE_N, random_state=42)

    X = StandardScaler().fit_transform(data)
    Z = linkage(X, method=method)
    labels = fcluster(Z, t=k, criterion="maxclust") - 1

    out = data.copy()
    out["cluster"] = labels
    summary = out.groupby("cluster")[feats].mean().round(3)
    summary.insert(0, "件数", out.groupby("cluster").size())

    coords, explained = (None, None)
    if X.shape[1] >= 2:
        coords, explained = _pca2d(X)

    return ClusterResult(labels, out, summary.reset_index(), coords, explained,
                         extra={"linkage": Z, "features": feats, "warnings": warnings})


def _pca2d(X):
    from sklearn.decomposition import PCA

    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(X)
    return coords, tuple(np.round(pca.explained_variance_ratio_, 3))
