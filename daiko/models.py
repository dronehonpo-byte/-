"""データモデル — 要件定義書 第9章「管理データ項目」に対応.

主要構造:
  Request(リクエスト) 1 ── * Entry(エントリー)   … 料金提示型マッチング
  Vendor(業者)        1 ── * Driver(ドライバー)   … 親子構造（承認は業者単位）
"""
from __future__ import annotations

import enum
from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


# ─────────────────────────────────────────────────────────────
# 列挙体（状態）
# ─────────────────────────────────────────────────────────────
class RequestStatus(str, enum.Enum):
    """リクエストの状態遷移（要件定義書 第5章・最重要）."""

    RECRUITING = "recruiting"      # 募集中
    ENTERED = "entered"            # エントリーあり
    CONFIRMED = "confirmed"        # 確定
    IN_PROGRESS = "in_progress"    # 対応中
    COMPLETED = "completed"        # 完了
    CANCELLED = "cancelled"        # キャンセル

    @property
    def label(self) -> str:
        return {
            "recruiting": "募集中",
            "entered": "エントリーあり",
            "confirmed": "確定",
            "in_progress": "対応中",
            "completed": "完了",
            "cancelled": "キャンセル",
        }[self.value]

    @property
    def is_open(self) -> bool:
        """まだエントリー受付中か（ドライバー一覧に出すか）."""
        return self in (RequestStatus.RECRUITING, RequestStatus.ENTERED)

    @property
    def is_active(self) -> bool:
        """進行中（完了/キャンセルでない）か."""
        return self not in (RequestStatus.COMPLETED, RequestStatus.CANCELLED)


class EntryStatus(str, enum.Enum):
    OFFERED = "offered"     # 提示中
    ACCEPTED = "accepted"   # 成立
    REJECTED = "rejected"   # 不成立

    @property
    def label(self) -> str:
        return {"offered": "提示中", "accepted": "成立", "rejected": "不成立"}[self.value]


class VendorStatus(str, enum.Enum):
    PENDING = "pending"       # 承認待ち
    APPROVED = "approved"     # 承認済（稼働可）
    SUSPENDED = "suspended"   # 停止

    @property
    def label(self) -> str:
        return {"pending": "承認待ち", "approved": "承認済", "suspended": "停止"}[self.value]


class Transmission(str, enum.Enum):
    AT = "AT"
    MT = "MT"


class HandlePosition(str, enum.Enum):
    LEFT = "left"   # 左ハンドル
    RIGHT = "right"  # 右ハンドル

    @property
    def label(self) -> str:
        return {"left": "左ハンドル", "right": "右ハンドル"}[self.value]


# ─────────────────────────────────────────────────────────────
# エンティティ
# ─────────────────────────────────────────────────────────────
class Customer(db.Model):
    """お客様 — 電話番号(SMS認証)で登録."""

    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    requests = db.relationship("Request", back_populates="customer", lazy="dynamic")


class Vendor(db.Model):
    """業者（事業者）— 公安委員会認定を受けた代行業者. 承認の単位."""

    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    cert_filename = db.Column(db.String(255))  # 公安委員会認定書ファイル
    status = db.Column(db.Enum(VendorStatus), default=VendorStatus.PENDING, nullable=False)
    # キャンセル料・料金トラブル時の連絡など、業者ごとの料金ポリシー（自由記述）
    cancellation_policy = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    drivers = db.relationship("Driver", back_populates="vendor", lazy="dynamic")

    @property
    def is_active(self) -> bool:
        return self.status == VendorStatus.APPROVED


class Driver(db.Model):
    """ドライバー — 業者に所属し実際に運転する人. 電話番号+パスワードでログイン."""

    __tablename__ = "drivers"

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False, index=True)
    name = db.Column(db.String(80), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)  # 稼働ステータス
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    vendor = db.relationship("Vendor", back_populates="drivers")
    entries = db.relationship("Entry", back_populates="driver", lazy="dynamic")

    def set_password(self, raw: str) -> None:
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)

    @property
    def can_operate(self) -> bool:
        """承認済み業者に属し、稼働中か."""
        return self.active and self.vendor is not None and self.vendor.is_active


class Admin(db.Model):
    """管理者 — 運営者（まず1名）."""

    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    login_id = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def set_password(self, raw: str) -> None:
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)


class Request(db.Model):
    """リクエスト（依頼）— 本システムの心臓部."""

    __tablename__ = "requests"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False, index=True)

    # 出発地・目的地（緯度経度＋表示用ラベル）
    origin_lat = db.Column(db.Float, nullable=False)
    origin_lng = db.Column(db.Float, nullable=False)
    origin_label = db.Column(db.String(255))
    dest_lat = db.Column(db.Float, nullable=False)
    dest_lng = db.Column(db.Float, nullable=False)
    dest_label = db.Column(db.String(255))

    # 車両情報（タクシー配車と根本的に異なる軸）
    car_type = db.Column(db.String(60))                       # 例: 軽/普通/ワンボックス
    transmission = db.Column(db.Enum(Transmission), nullable=False)
    handle = db.Column(db.Enum(HandlePosition), default=HandlePosition.RIGHT, nullable=False)
    via_count = db.Column(db.Integer, default=0, nullable=False)  # 経由回数

    # 到着希望時間
    asap = db.Column(db.Boolean, default=True, nullable=False)
    scheduled_time = db.Column(db.DateTime)

    note = db.Column(db.String(255))

    status = db.Column(
        db.Enum(RequestStatus), default=RequestStatus.RECRUITING, nullable=False, index=True
    )
    confirmed_entry_id = db.Column(
        db.Integer, db.ForeignKey("entries.id", use_alter=True, name="fk_request_confirmed_entry")
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    customer = db.relationship("Customer", back_populates="requests")
    entries = db.relationship(
        "Entry",
        back_populates="request",
        lazy="dynamic",
        foreign_keys="Entry.request_id",
    )
    confirmed_entry = db.relationship("Entry", foreign_keys=[confirmed_entry_id], post_update=True)

    @property
    def time_label(self) -> str:
        if self.asap:
            return "今すぐ"
        if self.scheduled_time:
            return self.scheduled_time.strftime("%m/%d %H:%M")
        return "時刻指定"


class Entry(db.Model):
    """エントリー（応募）— ドライバーが料金＋到着時間を提示."""

    __tablename__ = "entries"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(
        db.Integer, db.ForeignKey("requests.id"), nullable=False, index=True
    )
    driver_id = db.Column(db.Integer, db.ForeignKey("drivers.id"), nullable=False, index=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False, index=True)

    price = db.Column(db.Integer, nullable=False)        # 提示料金（円）
    eta_minutes = db.Column(db.Integer, nullable=False)  # 到着予定（分）
    cancellation_fee = db.Column(db.String(255))         # 業者提示のキャンセル料
    status = db.Column(db.Enum(EntryStatus), default=EntryStatus.OFFERED, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    request = db.relationship("Request", back_populates="entries", foreign_keys=[request_id])
    driver = db.relationship("Driver", back_populates="entries")
    vendor = db.relationship("Vendor")

    __table_args__ = (
        db.UniqueConstraint("request_id", "driver_id", name="uq_entry_request_driver"),
    )


class Notification(db.Model):
    """通知 — 要件定義書 第10章. アプリ内通知として記録（Webプッシュは将来拡張）."""

    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(16), nullable=False, index=True)  # customer/driver/admin
    recipient_id = db.Column(db.Integer, nullable=False, index=True)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"))
    title = db.Column(db.String(120), nullable=False)
    body = db.Column(db.String(255))
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
