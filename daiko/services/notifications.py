"""アプリ内通知（要件定義書 第10章）.

Webプッシュは iOS 制約があるため、MVP ではアプリ内通知（DB記録＋ポーリング表示）で実装し、
将来 Web Push / ストアアプリへ拡張できる構造にしておく。
"""
from __future__ import annotations

from ..extensions import db
from ..models import Driver, Notification, Request, RequestStatus, Vendor


def notify(role: str, recipient_id: int, title: str, body: str = "", request_id: int | None = None) -> None:
    db.session.add(
        Notification(
            role=role,
            recipient_id=recipient_id,
            title=title,
            body=body,
            request_id=request_id,
        )
    )


def notify_nearby_drivers(req: Request, driver_ids: list[int]) -> None:
    """リクエスト送信時：近隣ドライバーへ「新しい依頼が入りました」."""
    for did in driver_ids:
        notify(
            "driver",
            did,
            "新しい依頼が入りました",
            f"{req.origin_label or '出発地'} → {req.dest_label or '目的地'}",
            req.id,
        )


def notify_admins(title: str, body: str = "", request_id: int | None = None) -> None:
    from ..models import Admin

    for admin in Admin.query.all():
        notify("admin", admin.id, title, body, request_id)


def unread_count(role: str, recipient_id: int) -> int:
    return Notification.query.filter_by(
        role=role, recipient_id=recipient_id, is_read=False
    ).count()
