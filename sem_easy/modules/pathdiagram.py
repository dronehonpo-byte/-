"""パス図の描画（重なりの回避と、正しい矢印の向き）。

依頼者要望への対応：
- 測定モデルの矢印は必ず「潜在変数 → 観測変数」の向き。
  （自己効力感という目に見えない性質が se_01 等の回答に表れる、という考え方）
- ノード・矢印・係数ラベル・変数名が重ならないよう、
  潜在変数ごとに横方向の領域を確保して配置する（領域が重ならないため衝突しない）。
- 係数は SEMResult の値をそのまま描画する（画面・表・図で数値がズレない）。
- PNG / SVG / PDF で高解像度出力する。
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyArrowPatch, Ellipse, Rectangle  # noqa: E402

_FONT_READY = False


def setup_font() -> None:
    """同梱の日本語フォントを登録する（文字化け＝豆腐を防ぐ）。"""
    global _FONT_READY
    if _FONT_READY:
        return
    from matplotlib import font_manager

    path = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "ipaexg.ttf"
    if path.exists():
        try:
            font_manager.fontManager.addfont(str(path))
            fam = font_manager.FontProperties(fname=str(path)).get_name()
            plt.rcParams["font.family"] = fam
            plt.rcParams["font.sans-serif"] = [fam] + plt.rcParams.get("font.sans-serif", [])
        except Exception:  # noqa: BLE001
            pass
    plt.rcParams["axes.unicode_minus"] = False
    _FONT_READY = True


def _topo_levels(nodes: list, edges: list) -> dict:
    """有向グラフの階層（原因が左、結果が右）を求める。"""
    level = {n: 0 for n in nodes}
    for _ in range(len(nodes) + 1):
        changed = False
        for a, b in edges:
            if a in level and b in level and level[b] < level[a] + 1:
                level[b] = level[a] + 1
                changed = True
        if not changed:
            break
    return level


def draw(
    result,
    *,
    standardized: bool = True,
    show_pvalue: bool = False,
    show_indicators: bool = True,
    figsize_scale: float = 1.0,
):
    """SEMResult からパス図を描く。数値は result.params の値をそのまま用いる。"""
    setup_font()
    spec = result.spec
    params = result.params

    coef_col = "標準化係数" if standardized else "非標準化係数"

    # --- 係数の取り出し（単一の真実である params のみを参照）---
    load: dict = {}   # (latent, indicator) -> (coef, p)
    path: dict = {}   # (src, dst) -> (coef, p)
    if params is not None and len(params):
        for _, r in params.iterrows():
            if r["演算子"] != "~":
                continue
            src, dst = r["右辺"], r["左辺"]
            val = r.get(coef_col, np.nan)
            pv = r.get("p値", np.nan)
            if r["種別"] == "因子負荷（潜在→観測）":
                load[(src, dst)] = (val, pv)
            else:
                path[(src, dst)] = (val, pv)

    latents = spec.latents
    struct_nodes = spec.structural_nodes()
    edges = list(spec.regressions)

    # --- 配置（潜在変数ごとに横方向の領域を確保 → 重なりが原理的に起きない）---
    level = _topo_levels(struct_nodes, edges)
    order = sorted(struct_nodes, key=lambda n: (level.get(n, 0), str(n)))

    band_w = {}
    for n in order:
        k = len(spec.measurement.get(n, [])) if show_indicators else 0
        band_w[n] = max(1, k) * 2.6 + 1.6

    pos = {}
    ind_pos = {}
    x_cursor = 0.0
    for n in order:
        w = band_w[n]
        cx = x_cursor + w / 2.0
        y = 0.0
        pos[n] = (cx, y)
        items = spec.measurement.get(n, []) if show_indicators else []
        if items:
            span = (len(items) - 1) * 2.6
            for j, it in enumerate(items):
                ind_pos[it] = (cx - span / 2.0 + j * 2.6, -3.4)
        x_cursor += w

    total_w = max(x_cursor, 6.0)
    fig_w = max(8.0, total_w * 0.62) * figsize_scale
    fig_h = (7.2 if (show_indicators and ind_pos) else 4.6) * figsize_scale
    fig, ax = plt.subplots(figsize=(fig_w, fig_h))
    ax.set_axis_off()

    def _fmt(v, pv):
        if v is None or not np.isfinite(v):
            return ""
        s = f"{v:.2f}"
        if show_pvalue and np.isfinite(pv):
            s += "***" if pv < 0.001 else ("**" if pv < 0.01 else ("*" if pv < 0.05 else ""))
        return s

    # --- 観測変数（長方形）---
    for name, (x, y) in ind_pos.items():
        ax.add_patch(Rectangle((x - 1.05, y - 0.52), 2.1, 1.04,
                               facecolor="#F2F6FA", edgecolor="#1E4E79", lw=1.4, zorder=2))
        ax.text(x, y, str(name), ha="center", va="center", fontsize=9, zorder=3)

    # --- 潜在変数（楕円）／構造上の観測変数（長方形）---
    for name, (x, y) in pos.items():
        if name in latents:
            ax.add_patch(Ellipse((x, y), 3.0, 1.5, facecolor="#E8F1FB",
                                 edgecolor="#1E4E79", lw=1.8, zorder=2))
        else:
            ax.add_patch(Rectangle((x - 1.35, y - 0.62), 2.7, 1.24,
                                   facecolor="#F2F6FA", edgecolor="#1E4E79", lw=1.6, zorder=2))
        ax.text(x, y, str(name), ha="center", va="center", fontsize=11,
                fontweight="bold", zorder=3)

    # --- 測定モデルの矢印：潜在 → 観測（向きが要件）---
    for lat, items in (spec.measurement.items() if show_indicators else []):
        if lat not in pos:
            continue
        lx, ly = pos[lat]
        for it in items:
            if it not in ind_pos:
                continue
            ix, iy = ind_pos[it]
            ax.add_patch(FancyArrowPatch(
                (lx, ly - 0.78), (ix, iy + 0.56),
                arrowstyle="-|>", mutation_scale=13, lw=1.2,
                color="#42607F", shrinkA=0, shrinkB=0, zorder=1,
            ))
            v, pv = load.get((lat, it), (np.nan, np.nan))
            txt = _fmt(v, pv)
            if txt:
                mx, my = (lx + ix) / 2.0, (ly - 0.78 + iy + 0.56) / 2.0
                ax.text(mx + 0.22, my, txt, fontsize=8, color="#1E4E79",
                        ha="left", va="center", zorder=4,
                        bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85))

    # --- 構造モデルの矢印（同一レベルはアーチで回避）---
    for (a, b) in edges:
        if a not in pos or b not in pos:
            continue
        ax_, ay = pos[a]
        bx, by = pos[b]
        same_level = level.get(a, 0) == level.get(b, 0)
        skip = abs(level.get(b, 0) - level.get(a, 0)) > 1
        rad = 0.0
        if same_level:
            rad = 0.45
        elif skip:
            rad = -0.28
        # ノードの縁から縁へ
        dx = bx - ax_
        offset = 1.55 if a in latents else 1.4
        start = (ax_ + np.sign(dx) * offset, ay + (0.4 if same_level else 0))
        end = (bx - np.sign(dx) * offset, by + (0.4 if same_level else 0))
        ax.add_patch(FancyArrowPatch(
            start, end, arrowstyle="-|>", mutation_scale=16, lw=1.9,
            color="#B03A2E", connectionstyle=f"arc3,rad={rad}",
            shrinkA=0, shrinkB=0, zorder=1,
        ))
        v, pv = path.get((a, b), (np.nan, np.nan))
        txt = _fmt(v, pv)
        if txt:
            mx, my = (start[0] + end[0]) / 2.0, (start[1] + end[1]) / 2.0
            my += 0.62 + (1.0 if same_level else 0.0) + (0.5 if skip else 0.0)
            ax.text(mx, my, txt, fontsize=10, color="#B03A2E", ha="center", va="center",
                    fontweight="bold", zorder=4,
                    bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="#E6B0AA", alpha=0.95))

    # --- 表示範囲（余白を確保して見切れを防ぐ）---
    xs = [p[0] for p in pos.values()] + [p[0] for p in ind_pos.values()] or [0]
    ys = [p[1] for p in pos.values()] + [p[1] for p in ind_pos.values()] or [0]
    ax.set_xlim(min(xs) - 2.4, max(xs) + 2.4)
    ax.set_ylim(min(ys) - 1.8, max(ys) + 2.8)

    kind = "標準化係数" if standardized else "非標準化係数"
    ax.set_title(f"{result.model_name}（{kind}）", fontsize=12, pad=14)
    fig.tight_layout()
    return fig


def to_bytes(fig, fmt: str = "png") -> bytes:
    """図をバイト列に変換（PNG は 300dpi、SVG/PDF はベクター）。"""
    buf = BytesIO()
    if fmt == "png":
        fig.savefig(buf, format="png", dpi=300, bbox_inches="tight", facecolor="white")
    elif fmt == "pdf":
        fig.savefig(buf, format="pdf", bbox_inches="tight", facecolor="white")
    else:
        fig.savefig(buf, format="svg", bbox_inches="tight", facecolor="white")
    buf.seek(0)
    return buf.getvalue()
