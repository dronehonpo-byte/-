import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from typing import Iterable

from flask import current_app

log = logging.getLogger(__name__)


def _build_message(
    *,
    subject: str,
    to: str,
    body_text: str,
    body_html: str | None = None,
    from_email: str | None = None,
    from_name: str | None = None,
    reply_to: str | None = None,
    headers: dict[str, str] | None = None,
) -> EmailMessage:
    cfg = current_app.config
    sender = from_email or cfg["MAIL_DEFAULT_FROM"]

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, sender)) if from_name else sender
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to
    for k, v in (headers or {}).items():
        msg[k] = v

    msg.set_content(body_text or "")
    if body_html:
        msg.add_alternative(body_html, subtype="html")
    return msg


def send_email(
    *,
    subject: str,
    to: str,
    body_text: str = "",
    body_html: str | None = None,
    from_email: str | None = None,
    from_name: str | None = None,
    reply_to: str | None = None,
    headers: dict[str, str] | None = None,
) -> None:
    msg = _build_message(
        subject=subject,
        to=to,
        body_text=body_text,
        body_html=body_html,
        from_email=from_email,
        from_name=from_name,
        reply_to=reply_to,
        headers=headers,
    )

    cfg = current_app.config
    if cfg.get("MAIL_DEBUG_LOG"):
        log.warning("[MAIL_DEBUG] to=%s subject=%s\n%s", to, subject, msg.as_string())
        return

    host, port = cfg["SMTP_HOST"], cfg["SMTP_PORT"]
    if cfg["SMTP_USE_SSL"]:
        client = smtplib.SMTP_SSL(host, port, timeout=30)
    else:
        client = smtplib.SMTP(host, port, timeout=30)
    try:
        client.ehlo()
        if cfg["SMTP_USE_TLS"] and not cfg["SMTP_USE_SSL"]:
            client.starttls()
            client.ehlo()
        if cfg["SMTP_USER"]:
            client.login(cfg["SMTP_USER"], cfg["SMTP_PASSWORD"])
        client.send_message(msg)
    finally:
        try:
            client.quit()
        except Exception:
            client.close()


def send_bulk(messages: Iterable[dict]) -> tuple[int, int]:
    sent = failed = 0
    for kwargs in messages:
        try:
            send_email(**kwargs)
            sent += 1
        except Exception:
            log.exception("send_email failed for %s", kwargs.get("to"))
            failed += 1
    return sent, failed
