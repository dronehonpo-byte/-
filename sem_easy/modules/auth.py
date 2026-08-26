"""ID・パスワード認証。

依頼者要望への対応：
- パスワードを平文で保存しない（PBKDF2-HMAC-SHA256 でハッシュ化し、利用者ごとに salt を付す）
- 管理者による利用者発行（users.json を管理者が編集／本モジュールの関数で追加）
- 一定回数の失敗でロック
- セッション期限とログアウト
- 利用者ごとのデータ分離（セッション内のデータを利用者IDで名前空間化）
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

JST = timezone(timedelta(hours=9))

USERS_FILE = Path(__file__).resolve().parent.parent / "users.json"

PBKDF2_ROUNDS = 200_000
MAX_FAILURES = 5           # この回数を超えるとロック
LOCK_MINUTES = 15          # ロック時間（分）
SESSION_HOURS = 8          # セッション有効時間


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """パスワードをハッシュ化する。平文は保存しない。"""
    if salt is None:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"),
                             bytes.fromhex(salt), PBKDF2_ROUNDS)
    return dk.hex(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """タイミング攻撃に配慮した比較。"""
    calc, _ = hash_password(password, salt)
    return hmac.compare_digest(calc, stored_hash)


def load_users() -> dict:
    if not USERS_FILE.exists():
        return {}
    try:
        return json.loads(USERS_FILE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def save_users(users: dict) -> None:
    USERS_FILE.write_text(
        json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def create_user(user_id: str, password: str, *, display_name: str = "",
                expires: str | None = None) -> dict:
    """管理者が利用者を発行する（平文パスワードは保存されない）。"""
    users = load_users()
    h, salt = hash_password(password)
    users[user_id] = {
        "hash": h,
        "salt": salt,
        "display_name": display_name or user_id,
        "created_at": datetime.now(JST).isoformat(timespec="seconds"),
        "expires": expires,          # "YYYY-MM-DD" 形式。None なら無期限
        "failures": 0,
        "locked_until": None,
    }
    save_users(users)
    return users[user_id]


def _now() -> datetime:
    return datetime.now(JST)


def authenticate(user_id: str, password: str) -> tuple[bool, str]:
    """認証を行い、(成功可否, メッセージ) を返す。"""
    users = load_users()
    rec = users.get(user_id)
    if rec is None:
        # 利用者の存在有無を推測されないよう、共通のメッセージにする
        return False, "IDまたはパスワードが正しくありません。"

    # ロック確認
    locked_until = rec.get("locked_until")
    if locked_until:
        try:
            until = datetime.fromisoformat(locked_until)
            if _now() < until:
                mins = int((until - _now()).total_seconds() // 60) + 1
                return False, (
                    f"パスワードの入力に複数回失敗したため、一時的にロックされています。"
                    f"約 {mins} 分後に再度お試しください。"
                )
        except ValueError:
            pass

    # 利用期限
    exp = rec.get("expires")
    if exp:
        try:
            if _now().date() > datetime.fromisoformat(exp).date():
                return False, "このアカウントは利用期限を過ぎています。管理者にご連絡ください。"
        except ValueError:
            pass

    if verify_password(password, rec["hash"], rec["salt"]):
        rec["failures"] = 0
        rec["locked_until"] = None
        rec["last_login"] = _now().isoformat(timespec="seconds")
        users[user_id] = rec
        save_users(users)
        return True, "ログインしました。"

    # 失敗回数を加算
    rec["failures"] = int(rec.get("failures", 0)) + 1
    remaining = MAX_FAILURES - rec["failures"]
    if rec["failures"] >= MAX_FAILURES:
        rec["locked_until"] = (_now() + timedelta(minutes=LOCK_MINUTES)).isoformat(timespec="seconds")
        rec["failures"] = 0
        msg = (
            f"パスワードの入力に {MAX_FAILURES} 回失敗したため、"
            f"{LOCK_MINUTES} 分間ロックしました。"
        )
    else:
        msg = f"IDまたはパスワードが正しくありません。（あと {remaining} 回でロックされます）"
    users[user_id] = rec
    save_users(users)
    return False, msg


# ---- Streamlit 連携 ----

def session_key(user_id: str, key: str) -> str:
    """利用者ごとにデータを分離するためのセッションキー。"""
    return f"u::{user_id}::{key}"


def current_user() -> str | None:
    import streamlit as st

    if not st.session_state.get("auth_user"):
        return None
    # セッション期限の確認
    started = st.session_state.get("auth_started_at")
    if started:
        try:
            if _now() > datetime.fromisoformat(started) + timedelta(hours=SESSION_HOURS):
                logout()
                return None
        except ValueError:
            pass
    return st.session_state.get("auth_user")


def logout() -> None:
    import streamlit as st

    uid = st.session_state.get("auth_user")
    for k in list(st.session_state.keys()):
        if k.startswith("auth_") or (uid and str(k).startswith(f"u::{uid}::")):
            del st.session_state[k]


def require_login() -> str:
    """未ログインならログイン画面を表示して停止する。全ページの先頭で呼ぶ。"""
    import streamlit as st

    uid = current_user()
    if uid:
        return uid

    _, center, _ = st.columns([1, 2, 1])
    with center:
        st.markdown(
            "<div style='background:linear-gradient(135deg,#1E4E79,#2E7BB8);"
            "color:#fff;padding:1.4rem 1.6rem;border-radius:10px;margin-bottom:1rem;'>"
            "<h1 style='margin:0;color:#fff;'>SEMEasy</h1>"
            "<p style='margin:.3rem 0 0;opacity:.9;'>共分散構造分析（SEM）支援ツール</p></div>",
            unsafe_allow_html=True,
        )
        st.markdown("#### 🔒 ID とパスワードを入力してください")
        with st.form("sem_login"):
            uid_in = st.text_input("ID", placeholder="ユーザーID")
            pw_in = st.text_input("パスワード", type="password", placeholder="パスワード")
            ok = st.form_submit_button("ログイン", use_container_width=True)
        if ok:
            success, msg = authenticate(uid_in.strip(), pw_in)
            if success:
                st.session_state["auth_user"] = uid_in.strip()
                st.session_state["auth_started_at"] = _now().isoformat(timespec="seconds")
                st.rerun()
            else:
                st.error(msg)
        st.caption(
            "※ パスワードはハッシュ化して保存され、平文では保存されません。"
            f"　{MAX_FAILURES} 回連続で失敗すると {LOCK_MINUTES} 分間ロックされます。"
        )
        st.markdown(
            "<div style='text-align:center;color:#5A6B7B;font-size:.82rem;"
            "border-top:1px solid #E2E8F0;padding-top:.6rem;margin-top:1.2rem;'>"
            "開発：株式会社Miyabee</div>",
            unsafe_allow_html=True,
        )
    st.stop()
