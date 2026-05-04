"""メール送信サービス.

EMAIL_BACKEND env で実装を切り替える:
  - 'sendgrid' : SENDGRID_API_KEY を使って HTTPS で SendGrid v3 API に POST
  - 'smtp'     : SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_USE_TLS で送信
  - 'console'  : 標準ロガーに出すだけ (dev / 未設定時の安全フォールバック)
"""
from __future__ import annotations

import json
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Iterable

import requests
from flask import current_app, render_template


@dataclass
class EmailMessageData:
    to: str
    subject: str
    text: str
    html: str | None = None
    to_name: str | None = None
    reply_to: str | None = None


# ---------- 公開 API ----------

def send_email(msg: EmailMessageData) -> bool:
    """メール送信. 成功で True / 失敗で False (例外は投げない)."""
    backend = (current_app.config.get("EMAIL_BACKEND") or "console").lower()
    try:
        if backend == "sendgrid":
            return _send_sendgrid(msg)
        if backend == "smtp":
            return _send_smtp(msg)
        # default: console
        _send_console(msg)
        return True
    except Exception as e:  # noqa: BLE001
        current_app.logger.exception("Email send failed (backend=%s): %s", backend, e)
        return False


def render_email(template_basename: str, **context) -> tuple[str, str]:
    """templates/email/<basename>.txt と .html を render し (text, html) を返す."""
    text = render_template(f"email/{template_basename}.txt", **context)
    try:
        html = render_template(f"email/{template_basename}.html", **context)
    except Exception:
        html = None  # html 版が無くても可
    return text, html


# ---------- 各バックエンド ----------

def _from() -> tuple[str, str]:
    return (
        current_app.config.get("DEFAULT_FROM_NAME") or "電子契約",
        current_app.config.get("DEFAULT_FROM_EMAIL") or "noreply@example.com",
    )


def _send_console(msg: EmailMessageData) -> None:
    from_name, from_email = _from()
    current_app.logger.info(
        "[email/console] from=%s <%s> to=%s subject=%s\n%s",
        from_name, from_email, msg.to, msg.subject, msg.text[:500],
    )


def _send_sendgrid(msg: EmailMessageData) -> bool:
    api_key = current_app.config.get("SENDGRID_API_KEY")
    if not api_key:
        current_app.logger.error("SENDGRID_API_KEY が未設定です")
        return False
    from_name, from_email = _from()
    payload: dict = {
        "personalizations": [{
            "to": [{"email": msg.to, "name": msg.to_name} if msg.to_name else {"email": msg.to}],
            "subject": msg.subject,
        }],
        "from": {"email": from_email, "name": from_name},
        "content": [{"type": "text/plain", "value": msg.text}],
    }
    if msg.reply_to:
        payload["reply_to"] = {"email": msg.reply_to}
    if msg.html:
        payload["content"].append({"type": "text/html", "value": msg.html})

    r = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        data=json.dumps(payload),
        timeout=15,
    )
    if 200 <= r.status_code < 300:
        return True
    current_app.logger.error("SendGrid error %s: %s", r.status_code, r.text[:300])
    return False


def _send_smtp(msg: EmailMessageData) -> bool:
    host = current_app.config.get("SMTP_HOST")
    if not host:
        current_app.logger.error("SMTP_HOST が未設定です")
        return False
    port = int(current_app.config.get("SMTP_PORT") or 587)
    user = current_app.config.get("SMTP_USER")
    password = current_app.config.get("SMTP_PASSWORD")
    use_tls = bool(current_app.config.get("SMTP_USE_TLS", True))

    from_name, from_email = _from()
    em = EmailMessage()
    em["Subject"] = msg.subject
    em["From"] = f"{from_name} <{from_email}>"
    em["To"] = f"{msg.to_name} <{msg.to}>" if msg.to_name else msg.to
    if msg.reply_to:
        em["Reply-To"] = msg.reply_to
    em.set_content(msg.text)
    if msg.html:
        em.add_alternative(msg.html, subtype="html")

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as s:
            if user:
                s.login(user, password or "")
            s.send_message(em)
    else:
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.ehlo()
            if use_tls:
                s.starttls(context=context)
                s.ehlo()
            if user:
                s.login(user, password or "")
            s.send_message(em)
    return True


# ---------- ドメインAPI: 契約メール ----------

def send_signature_request(signer, contract, base_url: str, sender_name: str | None = None) -> bool:
    """署名依頼メール (1人あて)."""
    sign_url = f"{base_url}/sign/{signer.access_token}"
    text, html = render_email(
        "sign_request",
        signer=signer,
        contract=contract,
        sign_url=sign_url,
        sender_name=sender_name or (contract.creator.name if contract.creator else ""),
        company_name=current_app.config.get("COMPANY_NAME", ""),
    )
    msg = EmailMessageData(
        to=signer.email,
        to_name=signer.name,
        subject=f"【署名のお願い】{contract.title}",
        text=text,
        html=html,
    )
    return send_email(msg)


def send_completion_notice(recipient_email: str, recipient_name: str | None, contract, base_url: str, is_internal: bool) -> bool:
    """締結完了通知 (発信者・各署名者あて)."""
    download_url = f"{base_url}/contracts/{contract.id}/pdf" if is_internal else None
    text, html = render_email(
        "completed",
        recipient_name=recipient_name or recipient_email,
        contract=contract,
        download_url=download_url,
        is_internal=is_internal,
        company_name=current_app.config.get("COMPANY_NAME", ""),
    )
    msg = EmailMessageData(
        to=recipient_email,
        to_name=recipient_name,
        subject=f"【締結完了】{contract.title}",
        text=text,
        html=html,
    )
    return send_email(msg)


def send_reminder(signer, contract, base_url: str) -> bool:
    sign_url = f"{base_url}/sign/{signer.access_token}"
    text, html = render_email(
        "reminder",
        signer=signer,
        contract=contract,
        sign_url=sign_url,
        company_name=current_app.config.get("COMPANY_NAME", ""),
    )
    msg = EmailMessageData(
        to=signer.email,
        to_name=signer.name,
        subject=f"【再送/署名のお願い】{contract.title}",
        text=text,
        html=html,
    )
    return send_email(msg)
