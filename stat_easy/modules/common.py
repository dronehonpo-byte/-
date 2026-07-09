"""共通ユーティリティ。

StatEasy 全体で使うフッタークレジット、CSS 読み込み、日本語フォント設定、
数値フォーマット（APA 形式の有効桁数ルール）などをまとめる。

統計計算は SciPy / statsmodels / scikit-learn / pandas / NumPy のみで行い、
生成 AI は一切利用しない（再現性の担保のため）。
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np

# クレジット表記（必ずフッターに表示する）
CREDIT_TEXT = "開発：土居拓務・株式会社Miyabee"

# 版数（更新が反映されているか一目で確認できるよう画面に表示する）
APP_VERSION = "2026-07-09 更新版"

ROOT_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT_DIR / "assets"
SAMPLE_DIR = ROOT_DIR / "sample_data"

# 効果量の解釈基準（Cohen 1988 ほか）
EFFECT_SIZE_THRESHOLDS = {
    "d": [(0.2, "小 (small)"), (0.5, "中 (medium)"), (0.8, "大 (large)")],
    "r": [(0.1, "小 (small)"), (0.3, "中 (medium)"), (0.5, "大 (large)")],
    "eta2": [(0.01, "小 (small)"), (0.06, "中 (medium)"), (0.14, "大 (large)")],
    "cramers_v": [(0.1, "小 (small)"), (0.3, "中 (medium)"), (0.5, "大 (large)")],
}


def setup_japanese_font() -> None:
    """matplotlib の日本語フォントを設定（文字化け＝豆腐 □ を防ぐ）。

    アプリに同梱した IPAexGothic (assets/fonts/ipaexg.ttf) を最優先で登録する。
    これによりローカル(Windows)・ブラウザ内実行(stlite/Pyodide) のいずれでも
    japanize-matplotlib やシステムフォントの有無に依存せず日本語が表示される。
    """
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager

    family = None

    # ① 同梱フォントを登録（最優先・最も確実）
    bundled = ASSETS_DIR / "fonts" / "ipaexg.ttf"
    if bundled.exists():
        try:
            font_manager.fontManager.addfont(str(bundled))
            family = font_manager.FontProperties(fname=str(bundled)).get_name()
        except Exception:
            family = None

    # ② japanize-matplotlib があれば利用
    if family is None:
        try:
            import japanize_matplotlib  # noqa: F401

            family = plt.rcParams.get("font.family", ["sans-serif"])[0]
        except Exception:
            family = None

    # ③ システムにある日本語フォントを探索
    if family is None:
        for cand in ("IPAexGothic", "IPAGothic", "Noto Sans CJK JP",
                     "Noto Sans JP", "TakaoGothic", "VL Gothic", "Yu Gothic",
                     "MS Gothic", "Meiryo"):
            try:
                path = font_manager.findfont(cand, fallback_to_default=False)
                if path:
                    family = cand
                    break
            except Exception:
                continue

    if family:
        plt.rcParams["font.family"] = family
        plt.rcParams["font.sans-serif"] = [family] + plt.rcParams.get("font.sans-serif", [])

    plt.rcParams["axes.unicode_minus"] = False
    plt.rcParams["figure.dpi"] = 110
    plt.rcParams["savefig.dpi"] = 300
    plt.rcParams["font.size"] = 12
    plt.rcParams["axes.grid"] = True
    plt.rcParams["grid.alpha"] = 0.25
    plt.rcParams["figure.facecolor"] = "white"
    plt.rcParams["axes.facecolor"] = "white"


def fmt_p(p: float) -> str:
    """p 値を APA 形式で整形（小数点 3 桁、< .001 表記）。"""
    if p is None or (isinstance(p, float) and np.isnan(p)):
        return "—"
    if p < 0.001:
        return "< .001"
    return f"{p:.3f}".lstrip("0") if p < 1 else f"{p:.3f}"


def fmt_num(x: float, digits: int = 3) -> str:
    """一般の数値を指定桁で整形。"""
    if x is None or (isinstance(x, float) and (np.isnan(x) or np.isinf(x))):
        return "—"
    return f"{x:.{digits}f}"


def stars(p: float) -> str:
    """有意水準の星表記。"""
    if p is None or np.isnan(p):
        return ""
    if p < 0.001:
        return "***"
    if p < 0.01:
        return "**"
    if p < 0.05:
        return "*"
    return "n.s."


def interpret_effect(value: float, kind: str) -> str:
    """効果量の大きさを言葉で解釈する。"""
    table = EFFECT_SIZE_THRESHOLDS.get(kind)
    if table is None or value is None or np.isnan(value):
        return "—"
    av = abs(value)
    label = "ごく小 (negligible)"
    for thr, name in table:
        if av >= thr:
            label = name
    return label


# ---- Streamlit ヘルパー（import 失敗してもモジュール単体テストは可能）----

def load_css() -> None:
    import streamlit as st

    css_path = ASSETS_DIR / "style.css"
    if css_path.exists():
        st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


def render_footer() -> None:
    """全ページ共通のクレジットフッターを表示。"""
    import streamlit as st

    st.markdown(
        f"<div class='stateasy-footer'>{CREDIT_TEXT}</div>",
        unsafe_allow_html=True,
    )


def render_sidebar_credit() -> None:
    import streamlit as st

    st.sidebar.markdown("---")
    st.sidebar.markdown(
        "<div style='font-size:0.8rem;color:#5A6B7B;'>開発：土居拓務<br>株式会社Miyabee"
        f"<br><span style='color:#9AA7B4;'>版: {APP_VERSION}</span></div>",
        unsafe_allow_html=True,
    )


def get_data():
    """セッションに保存された解析対象 DataFrame を取得（無ければ None）。"""
    import streamlit as st

    return st.session_state.get("df")


def require_data():
    """データ未アップロード時に案内を出して停止する。"""
    import streamlit as st

    df = get_data()
    if df is None:
        st.warning("まずは「データアップロード」ページで CSV / Excel を読み込んでください。")
        st.page_link("pages/01_upload.py", label="➡ データアップロードへ", icon="📁")
        st.stop()
    return df
