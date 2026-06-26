"""マッチングの心臓部 — リクエスト状態遷移とエントリー確定（二重確定防止）.

要件定義書 第5章のとおり:
  募集中 → エントリーあり → 確定 → 対応中 → 完了 / キャンセル

確定時は「選択した瞬間に1名でロック」して二重確定の事故を防ぐ。
DB レベルの条件付き UPDATE（status を WHERE 句に含める）で原子的に確定させる。
"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import update

from ..extensions import db
from ..models import (
    Driver,
    Entry,
    EntryStatus,
    HandlePosition,
    Request,
    RequestStatus,
    Transmission,
    Vendor,
    VendorStatus,
)
from . import notifications as notif
from .geo import haversine_km


class MatchingError(Exception):
    """マッチング操作の業務エラー（ユーザーに見せるメッセージ付き）."""


# ─────────────────────────────────────────────────────────────
# リクエスト作成
# ─────────────────────────────────────────────────────────────
def create_request(customer_id: int, data: dict) -> Request:
    req = Request(
        customer_id=customer_id,
        origin_lat=float(data["origin_lat"]),
        origin_lng=float(data["origin_lng"]),
        origin_label=data.get("origin_label"),
        dest_lat=float(data["dest_lat"]),
        dest_lng=float(data["dest_lng"]),
        dest_label=data.get("dest_label"),
        car_type=data.get("car_type"),
        transmission=Transmission(data.get("transmission", "AT")),
        handle=HandlePosition(data.get("handle", "right")),
        via_count=int(data.get("via_count", 0) or 0),
        asap=bool(data.get("asap", True)),
        scheduled_time=data.get("scheduled_time"),
        note=data.get("note"),
        status=RequestStatus.RECRUITING,
    )
    db.session.add(req)
    db.session.flush()  # req.id を確定

    # 近隣ドライバーへ通知（要件定義書 第10章）
    driver_ids = nearby_driver_ids(req.origin_lat, req.origin_lng)
    notif.notify_nearby_drivers(req, driver_ids)
    notif.notify_admins("新規リクエスト", f"#{req.id} {req.origin_label or ''}", req.id)

    db.session.commit()
    return req


def nearby_driver_ids(lat: float, lng: float) -> list[int]:
    """承認済み業者に属する稼働中ドライバーのうち近隣のものを返す.

    MVP ではドライバーの常時位置は保持しないため、エリア内の稼働ドライバー全員へ配信する。
    （将来、ドライバー位置を保持すれば半径での厳密な絞り込みに置き換え可能）
    """
    drivers = (
        Driver.query.join(Vendor)
        .filter(Driver.active.is_(True), Vendor.status == VendorStatus.APPROVED)
        .all()
    )
    return [d.id for d in drivers]


# ─────────────────────────────────────────────────────────────
# 自動締め切り（時間切れ）
# ─────────────────────────────────────────────────────────────
def expire_if_stale(req: Request) -> bool:
    """募集中で締め切り時刻を過ぎていれば「時間切れ」にする.

    サーバー常駐の仕組みを使わず、画面アクセス時（お客様のポーリング・
    ドライバー一覧表示など）に判定して締め切る方式。締め切れたら True。
    """
    if req is None or not req.status.is_open or not req.is_time_expired:
        return False
    req.status = RequestStatus.EXPIRED
    req.updated_at = datetime.utcnow()
    Entry.query.filter(
        Entry.request_id == req.id, Entry.status == EntryStatus.OFFERED
    ).update({Entry.status: EntryStatus.REJECTED}, synchronize_session=False)
    notif.notify(
        "customer", req.customer_id,
        "募集を締め切りました",
        "制限時間（10分）内にドライバーが確定しませんでした。もう一度依頼できます。",
        req.id,
    )
    notif.notify_admins("リクエスト時間切れ", f"#{req.id}", req.id)
    db.session.commit()
    return True


def expire_all_stale() -> int:
    """募集中で締め切りを過ぎたリクエストをまとめて時間切れにする（一覧表示時）."""
    cutoff = datetime.utcnow() - timedelta(seconds=Request.RECRUIT_TTL_SECONDS)
    stale = (
        Request.query.filter(
            Request.status.in_([RequestStatus.RECRUITING, RequestStatus.ENTERED]),
            Request.created_at <= cutoff,
        ).all()
    )
    for req in stale:
        expire_if_stale(req)
    return len(stale)


# ─────────────────────────────────────────────────────────────
# エントリー（ドライバーの応募）
# ─────────────────────────────────────────────────────────────
def add_entry(request_id: int, driver: Driver, price: int, eta_minutes: int, cancellation_fee: str | None = None) -> Entry:
    req = db.session.get(Request, request_id)
    if req is None:
        raise MatchingError("リクエストが見つかりません。")
    expire_if_stale(req)  # 締め切り時刻を過ぎていれば確定前に時間切れへ
    if not req.status.is_open:
        raise MatchingError("このリクエストは既に締め切られています。")
    if not driver.can_operate:
        raise MatchingError("業者の承認が未完了のためエントリーできません。")

    existing = Entry.query.filter_by(request_id=request_id, driver_id=driver.id).first()
    if existing:
        raise MatchingError("既にこのリクエストへエントリー済みです。")

    entry = Entry(
        request_id=request_id,
        driver_id=driver.id,
        vendor_id=driver.vendor_id,
        price=int(price),
        eta_minutes=int(eta_minutes),
        cancellation_fee=cancellation_fee or (driver.vendor.cancellation_policy if driver.vendor else None),
        status=EntryStatus.OFFERED,
    )
    db.session.add(entry)

    # 募集中 → エントリーあり
    if req.status == RequestStatus.RECRUITING:
        req.status = RequestStatus.ENTERED

    # お客様へ「ドライバーがエントリーしました」
    notif.notify(
        "customer",
        req.customer_id,
        "ドライバーがエントリーしました",
        f"{driver.vendor.name} / {price:,}円 / 約{eta_minutes}分",
        req.id,
    )
    db.session.commit()
    return entry


# ─────────────────────────────────────────────────────────────
# 確定（二重確定防止つき）
# ─────────────────────────────────────────────────────────────
def confirm_entry(request_id: int, entry_id: int, customer_id: int) -> Entry:
    """お客様が1名を選択して確定する.

    status を WHERE 条件に含めた原子的 UPDATE で「最初の1件だけ」が確定できるようにする。
    """
    req = db.session.get(Request, request_id)
    if req is None or req.customer_id != customer_id:
        raise MatchingError("リクエストが見つかりません。")

    entry = db.session.get(Entry, entry_id)
    if entry is None or entry.request_id != request_id:
        raise MatchingError("エントリーが見つかりません。")

    # 原子的ロック：ENTERED のときだけ CONFIRMED へ遷移できる
    result = db.session.execute(
        update(Request)
        .where(Request.id == request_id, Request.status == RequestStatus.ENTERED)
        .values(status=RequestStatus.CONFIRMED, confirmed_entry_id=entry_id, updated_at=datetime.utcnow())
    )
    if result.rowcount != 1:
        db.session.rollback()
        raise MatchingError("既に他のドライバーで確定済み、または締め切られました。")

    # 選ばれたエントリー＝成立、その他＝不成立
    entry.status = EntryStatus.ACCEPTED
    Entry.query.filter(
        Entry.request_id == request_id, Entry.id != entry_id, Entry.status == EntryStatus.OFFERED
    ).update({Entry.status: EntryStatus.REJECTED}, synchronize_session=False)

    # 通知：確定ドライバー／不成立ドライバー
    notif.notify("driver", entry.driver_id, "あなたに決まりました", "お客様の連絡先を確認できます。", req.id)
    for other in Entry.query.filter(
        Entry.request_id == request_id, Entry.id != entry_id, Entry.status == EntryStatus.REJECTED
    ).all():
        notif.notify("driver", other.driver_id, "今回は他の方に決まりました", "", req.id)
    notif.notify_admins("リクエスト確定", f"#{req.id}", req.id)

    db.session.commit()
    return entry


# ─────────────────────────────────────────────────────────────
# 進行・完了・キャンセル
# ─────────────────────────────────────────────────────────────
def start_progress(request_id: int, driver_id: int) -> Request:
    """確定ドライバーが対応を開始（確定 → 対応中）."""
    req = db.session.get(Request, request_id)
    if req is None:
        raise MatchingError("リクエストが見つかりません。")
    if req.confirmed_entry is None or req.confirmed_entry.driver_id != driver_id:
        raise MatchingError("担当ドライバーではありません。")
    if req.status != RequestStatus.CONFIRMED:
        raise MatchingError("対応開始できる状態ではありません。")
    req.status = RequestStatus.IN_PROGRESS
    req.updated_at = datetime.utcnow()
    notif.notify("customer", req.customer_id, "ドライバーが向かっています", "", req.id)
    db.session.commit()
    return req


def complete(request_id: int, by_driver_id: int) -> Request:
    """対応終了（対応中 → 完了）。料金は現地精算。"""
    req = db.session.get(Request, request_id)
    if req is None:
        raise MatchingError("リクエストが見つかりません。")
    if req.confirmed_entry is None or req.confirmed_entry.driver_id != by_driver_id:
        raise MatchingError("担当ドライバーではありません。")
    if req.status not in (RequestStatus.CONFIRMED, RequestStatus.IN_PROGRESS):
        raise MatchingError("完了できる状態ではありません。")
    req.status = RequestStatus.COMPLETED
    req.updated_at = datetime.utcnow()
    notif.notify("customer", req.customer_id, "対応が完了しました", "ご利用ありがとうございました。", req.id)
    notif.notify_admins("リクエスト完了", f"#{req.id}", req.id)
    db.session.commit()
    return req


def cancel(request_id: int, *, by_role: str, actor_id: int) -> Request:
    """キャンセル（確定前＝募集終了 / 確定後＝双方に通知）."""
    req = db.session.get(Request, request_id)
    if req is None:
        raise MatchingError("リクエストが見つかりません。")
    if not req.status.is_active:
        raise MatchingError("既に終了したリクエストです。")
    if by_role == "customer" and req.customer_id != actor_id:
        raise MatchingError("権限がありません。")

    was_confirmed = req.status in (RequestStatus.CONFIRMED, RequestStatus.IN_PROGRESS)
    req.status = RequestStatus.CANCELLED
    req.updated_at = datetime.utcnow()
    Entry.query.filter(Entry.request_id == request_id, Entry.status == EntryStatus.OFFERED).update(
        {Entry.status: EntryStatus.REJECTED}, synchronize_session=False
    )

    if was_confirmed and req.confirmed_entry is not None:
        # 確定後：相手方に通知
        if by_role == "customer":
            notif.notify("driver", req.confirmed_entry.driver_id, "依頼がキャンセルされました", "", req.id)
        else:
            notif.notify("customer", req.customer_id, "依頼がキャンセルされました", "", req.id)
    notif.notify_admins("リクエストキャンセル", f"#{req.id}", req.id)
    db.session.commit()
    return req
