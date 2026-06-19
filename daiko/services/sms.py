"""SMS 認証（電話番号ログイン）.

バックエンド:
- console : 認証コードをアプリログに出力（開発・デモ用）。設定により画面にも表示。
- twilio  : Twilio Verify/SMS で実送信（本番）。花田様名義の契約後に有効化。

OTP はサーバー側セッションに保存し、TTL（デフォルト5分）で失効する。
"""
from __future__ import annotations

import logging
import random
import time

from flask import current_app, session

log = logging.getLogger(__name__)

_SESSION_KEY = "_otp"


def normalize_phone(phone: str) -> str:
    """全角や記号を除いた数字だけの電話番号に正規化."""
    table = str.maketrans("０１２３４５６７８９", "0123456789")
    phone = (phone or "").translate(table)
    return "".join(ch for ch in phone if ch.isdigit())


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_code(phone: str) -> str | None:
    """認証コードを生成・送信し、セッションに保存する.

    console バックエンドかつ OTP_SHOW_IN_RESPONSE が真ならコードを返す（画面表示用）。
    本番（twilio）では None を返す。
    """
    code = _generate_code()
    session[_SESSION_KEY] = {"phone": phone, "code": code, "exp": time.time() + current_app.config["OTP_TTL_SECONDS"]}
    session.modified = True

    backend = current_app.config.get("SMS_BACKEND", "console")
    message = f"【{current_app.config['SERVICE_NAME']}】認証コード: {code}"

    if backend == "twilio":
        _send_twilio(phone, message)
        return None

    # console
    log.info("[SMS:console] to=%s body=%s", phone, message)
    if current_app.config.get("OTP_SHOW_IN_RESPONSE"):
        return code
    return None


def verify_code(phone: str, code: str) -> bool:
    data = session.get(_SESSION_KEY)
    if not data:
        return False
    if data.get("phone") != phone:
        return False
    if time.time() > data.get("exp", 0):
        session.pop(_SESSION_KEY, None)
        return False
    ok = str(code).strip() == data.get("code")
    if ok:
        session.pop(_SESSION_KEY, None)
    return ok


def _send_twilio(phone: str, body: str) -> None:
    sid = current_app.config["TWILIO_ACCOUNT_SID"]
    token = current_app.config["TWILIO_AUTH_TOKEN"]
    from_number = current_app.config["TWILIO_FROM_NUMBER"]
    if not (sid and token and from_number):
        raise RuntimeError("Twilio の認証情報（SID/TOKEN/FROM_NUMBER）が未設定です。")
    # 遅延 import：twilio 未インストールでも console モードは動く
    from twilio.rest import Client  # type: ignore

    to = phone if phone.startswith("+") else "+81" + phone.lstrip("0")
    Client(sid, token).messages.create(to=to, from_=from_number, body=body)
