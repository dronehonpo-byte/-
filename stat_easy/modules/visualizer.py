"""⑧ 図表出力（PNG/SVG）。

論文投稿に耐える品質（300dpi、白背景、薄いグリッド、日本語対応フォント）で
各種の図を生成し、PNG（300dpi）と SVG（ベクター）の両方で出力できる。
"""
from __future__ import annotations

from io import BytesIO

import numpy as np
import pandas as pd

from .common import setup_japanese_font

import matplotlib.pyplot as plt  # noqa: E402
import seaborn as sns  # noqa: E402

# 先に seaborn のスタイルを適用してから日本語フォントを設定する。
# （sns.set_style/set_theme は font.family を 'sans-serif' に戻すため、
#  順序を逆にすると同梱フォント設定が上書きされ豆腐 □ が発生する。）
sns.set_style("whitegrid")
setup_japanese_font()

# ラベル辞書（日本語 / 英語切り替え）
_LABELS = {
    "ja": {"freq": "度数", "value": "値", "density": "密度", "cluster": "クラスタ"},
    "en": {"freq": "Frequency", "value": "Value", "density": "Density", "cluster": "Cluster"},
}


def fig_to_bytes(fig, fmt: str = "png") -> bytes:
    """Figure を PNG(300dpi) または SVG のバイト列に変換する。"""
    buf = BytesIO()
    if fmt == "png":
        fig.savefig(buf, format="png", dpi=300, bbox_inches="tight", facecolor="white")
    else:
        fig.savefig(buf, format="svg", bbox_inches="tight", facecolor="white")
    buf.seek(0)
    return buf.getvalue()


def histogram(df, col, bins=30, kde=True, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    s = df[col].dropna()
    ax.hist(s, bins=bins, color="#1E6091", alpha=0.7, edgecolor="white", density=kde)
    if kde and len(s) > 1:
        from scipy import stats

        xs = np.linspace(s.min(), s.max(), 200)
        kde_fn = stats.gaussian_kde(s)
        ax.plot(xs, kde_fn(xs), color="#C0392B", lw=2, label="密度推定" if lang == "ja" else "KDE")
        # 正規分布曲線
        ax.plot(xs, stats.norm.pdf(xs, s.mean(), s.std()), "--", color="#2E8B57",
                lw=1.5, label="正規分布" if lang == "ja" else "Normal")
        ax.legend()
    ax.set_xlabel(col)
    ax.set_ylabel(_LABELS[lang]["density"] if kde else _LABELS[lang]["freq"])
    ax.set_title(title or f"{col} のヒストグラム")
    fig.tight_layout()
    return fig


def boxplot(df, value_col, group_col=None, strip=True, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    if group_col:
        sns.boxplot(data=df, x=group_col, y=value_col, ax=ax, hue=group_col,
                    palette="Blues", legend=False)
        if strip:
            sns.stripplot(data=df, x=group_col, y=value_col, ax=ax, color="#1A1A2E",
                          alpha=0.4, size=3)
    else:
        sns.boxplot(data=df, y=value_col, ax=ax, color="#1E6091")
        if strip:
            sns.stripplot(data=df, y=value_col, ax=ax, color="#1A1A2E", alpha=0.4, size=3)
    ax.set_title(title or f"{value_col} の箱ひげ図")
    fig.tight_layout()
    return fig


def violin(df, value_col, group_col=None, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    if group_col:
        sns.violinplot(data=df, x=group_col, y=value_col, ax=ax, hue=group_col,
                       palette="Blues", legend=False)
    else:
        sns.violinplot(data=df, y=value_col, ax=ax, color="#1E6091")
    ax.set_title(title or f"{value_col} のバイオリンプロット")
    fig.tight_layout()
    return fig


def scatter_regression(df, x_col, y_col, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    sns.regplot(data=df, x=x_col, y=y_col, ax=ax,
                scatter_kws={"alpha": 0.5, "color": "#1E6091"},
                line_kws={"color": "#C0392B"})
    ax.set_title(title or f"{x_col} と {y_col} の散布図（回帰直線・95%CI）")
    fig.tight_layout()
    return fig


def correlation_heatmap(corr, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(max(5, len(corr) * 0.8), max(4, len(corr) * 0.7)))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="RdBu_r", center=0, vmin=-1, vmax=1,
                square=True, ax=ax, cbar_kws={"shrink": 0.8})
    ax.set_title(title or ("相関ヒートマップ" if lang == "ja" else "Correlation heatmap"))
    fig.tight_layout()
    return fig


def roc_curve_plot(roc_data: dict, lang="ja", title=None):
    """roc_data: name -> (fpr, tpr, auc)。複数モデル重ね描き可。"""
    fig, ax = plt.subplots(figsize=(6, 6))
    for name, (fpr, tpr, auc_val) in roc_data.items():
        ax.plot(fpr, tpr, lw=2, label=f"{name} (AUC={auc_val:.3f})")
    ax.plot([0, 1], [0, 1], "--", color="gray", lw=1)
    ax.set_xlabel("偽陽性率 (FPR)" if lang == "ja" else "False Positive Rate")
    ax.set_ylabel("真陽性率 (TPR)" if lang == "ja" else "True Positive Rate")
    ax.set_title(title or ("ROC 曲線" if lang == "ja" else "ROC curve"))
    ax.legend(loc="lower right")
    fig.tight_layout()
    return fig


def bar_with_error(df, group_col, value_col, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    grp = df.groupby(group_col)[value_col]
    means = grp.mean()
    sems = grp.sem()
    ax.bar(means.index.astype(str), means.values, yerr=sems.values, capsize=5,
           color="#1E6091", alpha=0.8, edgecolor="white")
    ax.set_ylabel(value_col)
    ax.set_title(title or f"{group_col} 別 {value_col}（平均 ± SE）")
    fig.tight_layout()
    return fig


def missing_heatmap(df, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(8, 4.5))
    sns.heatmap(df.isna(), cbar=False, cmap="Greys", ax=ax)
    ax.set_title(title or ("欠損値ヒートマップ" if lang == "ja" else "Missing value heatmap"))
    fig.tight_layout()
    return fig


def feature_importance_plot(fi_df, lang="ja", title=None, top=15):
    data = fi_df.head(top).iloc[::-1]
    fig, ax = plt.subplots(figsize=(7, max(3, len(data) * 0.4)))
    ax.barh(data.iloc[:, 0].astype(str), data.iloc[:, 1], color="#1E6091")
    ax.set_xlabel("重要度" if lang == "ja" else "Importance")
    ax.set_title(title or ("特徴量重要度" if lang == "ja" else "Feature importance"))
    fig.tight_layout()
    return fig


def residual_plots(fitted, residuals, lang="ja"):
    """残差プロット + QQ プロットを横並びで返す。"""
    from scipy import stats

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
    axes[0].scatter(fitted, residuals, alpha=0.5, color="#1E6091")
    axes[0].axhline(0, color="#C0392B", ls="--")
    axes[0].set_xlabel("予測値" if lang == "ja" else "Fitted")
    axes[0].set_ylabel("残差" if lang == "ja" else "Residuals")
    axes[0].set_title("残差プロット" if lang == "ja" else "Residuals vs Fitted")

    stats.probplot(residuals, dist="norm", plot=axes[1])
    axes[1].set_title("QQ プロット" if lang == "ja" else "Normal Q-Q")
    fig.tight_layout()
    return fig


def dendrogram_plot(Z, lang="ja", title=None):
    from scipy.cluster.hierarchy import dendrogram

    fig, ax = plt.subplots(figsize=(9, 4.5))
    dendrogram(Z, ax=ax, no_labels=True, color_threshold=0.7 * max(Z[:, 2]))
    ax.set_title(title or ("デンドログラム" if lang == "ja" else "Dendrogram"))
    ax.set_ylabel("距離" if lang == "ja" else "Distance")
    fig.tight_layout()
    return fig


def pca_scatter(coords, labels, explained=None, lang="ja", title=None):
    fig, ax = plt.subplots(figsize=(7, 5.5))
    sc = ax.scatter(coords[:, 0], coords[:, 1], c=labels, cmap="tab10", alpha=0.7)
    xl = "PC1" if explained is None else f"PC1 ({explained[0]*100:.1f}%)"
    yl = "PC2" if explained is None else f"PC2 ({explained[1]*100:.1f}%)"
    ax.set_xlabel(xl)
    ax.set_ylabel(yl)
    ax.set_title(title or ("PCA 散布図（クラスタ色分け）" if lang == "ja" else "PCA scatter"))
    legend = ax.legend(*sc.legend_elements(), title=_LABELS[lang]["cluster"])
    ax.add_artist(legend)
    fig.tight_layout()
    return fig


def elbow_silhouette(suggestion, lang="ja"):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].plot(suggestion.k_values, suggestion.inertia, "o-", color="#1E6091")
    axes[0].set_xlabel("クラスタ数 k")
    axes[0].set_ylabel("慣性 (inertia)")
    axes[0].set_title("Elbow 法")
    axes[1].plot(suggestion.k_values, suggestion.silhouette, "o-", color="#C0392B")
    axes[1].axvline(suggestion.suggested_k, ls="--", color="gray")
    axes[1].set_xlabel("クラスタ数 k")
    axes[1].set_ylabel("シルエット係数")
    axes[1].set_title(f"シルエット係数（推奨 k={suggestion.suggested_k}）")
    fig.tight_layout()
    return fig
