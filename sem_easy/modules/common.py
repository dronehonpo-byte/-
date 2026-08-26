"""共通ユーティリティ（クレジット・CSS・数値整形・セッション）。"""
from __future__ import annotations

from pathlib import Path

import numpy as np

APP_NAME = "SEMEasy"
APP_VERSION = "1.0.0"
CREDIT_TEXT = "開発：株式会社Miyabee"

ROOT_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT_DIR / "assets"
SAMPLE_DIR = ROOT_DIR / "sample_data"

# 5段階フロー（依頼者要望の推奨フロー）
FLOW = [
    "① データ読込",
    "② 入力検査",
    "③ モデル作成",
    "④ 推定",
    "⑤ 結果・出力",
]


def fmt_p(p) -> str:
    if p is None or not np.isfinite(p):
        return "—"
    if p < 0.001:
        return "< .001"
    return f"{p:.3f}"


def fmt_num(x, digits: int = 3) -> str:
    if x is None or not np.isfinite(x):
        return "—"
    return f"{x:.{digits}f}"


def render_footer() -> None:
    import streamlit as st

    st.markdown(
        f"<div style='text-align:center;color:#5A6B7B;font-size:.82rem;"
        f"border-top:1px solid #E2E8F0;padding-top:.6rem;margin-top:1.6rem;'>"
        f"{CREDIT_TEXT}　／　{APP_NAME} {APP_VERSION}</div>",
        unsafe_allow_html=True,
    )


def render_sidebar(user_id: str | None = None) -> None:
    import streamlit as st
    from . import auth

    st.sidebar.markdown(f"## 📐 {APP_NAME}")
    st.sidebar.caption("共分散構造分析（SEM）支援ツール")
    if user_id:
        st.sidebar.markdown(f"**ログイン中：** {user_id}")
        if st.sidebar.button("ログアウト", use_container_width=True):
            auth.logout()
            st.rerun()
    st.sidebar.markdown("---")
    st.sidebar.markdown(
        f"<div style='font-size:.8rem;color:#5A6B7B;'>{CREDIT_TEXT}<br>"
        f"版: {APP_VERSION}</div>", unsafe_allow_html=True,
    )


def get_state(user_id: str, key: str, default=None):
    import streamlit as st
    from .auth import session_key

    return st.session_state.get(session_key(user_id, key), default)


def set_state(user_id: str, key: str, value) -> None:
    import streamlit as st
    from .auth import session_key

    st.session_state[session_key(user_id, key)] = value


def require_data(user_id: str):
    """データ未読込なら案内して停止する。"""
    import streamlit as st

    load = get_state(user_id, "load_result")
    if load is None:
        st.warning("まず「① データ読込」でデータを読み込んでください。")
        st.page_link("pages/01_data.py", label="➡ データ読込へ", icon="📂")
        st.stop()
    return load
