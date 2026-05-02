"""データベースモデル定義."""
from __future__ import annotations

import enum
import secrets
from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"             # 下書き
    SENT = "sent"               # 送信済み（署名待ち）
    PARTIALLY_SIGNED = "partial"  # 一部署名済み
    COMPLETED = "completed"     # 完了
    DECLINED = "declined"       # 拒否
    CANCELLED = "cancelled"     # 取り消し
    EXPIRED = "expired"         # 期限切れ

    @property
    def label(self) -> str:
        return {
            "draft": "下書き",
            "sent": "署名依頼中",
            "partial": "一部署名済み",
            "completed": "締結完了",
            "declined": "拒否",
            "cancelled": "取り消し",
            "expired": "期限切れ",
        }[self.value]

    @property
    def badge(self) -> str:
        return {
            "draft": "secondary",
            "sent": "info",
            "partial": "primary",
            "completed": "success",
            "declined": "danger",
            "cancelled": "dark",
            "expired": "warning",
        }[self.value]


class SignerStatus(str, enum.Enum):
    PENDING = "pending"
    SIGNED = "signed"
    DECLINED = "declined"

    @property
    def label(self) -> str:
        return {"pending": "未署名", "signed": "署名済み", "declined": "拒否"}[self.value]


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    department = db.Column(db.String(120))
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    contracts = db.relationship("Contract", back_populates="creator", lazy="dynamic")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email}>"


class Template(db.Model):
    __tablename__ = "templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    category = db.Column(db.String(60), nullable=False)
    description = db.Column(db.Text)
    body = db.Column(db.Text, nullable=False)  # プレースホルダ {{変数}} 入り本文
    variables_json = db.Column(db.Text, default="[]")  # 変数名のJSON配列
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Contract(db.Model):
    __tablename__ = "contracts"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default=ContractStatus.DRAFT.value, nullable=False, index=True)
    body = db.Column(db.Text)  # 本文（テンプレートから生成）
    pdf_path = db.Column(db.String(500))  # アップロード済みPDFのパス
    sealed_pdf_path = db.Column(db.String(500))  # 署名済みPDFのパス
    document_hash = db.Column(db.String(128))  # SHA-256
    expires_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    creator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey("templates.id"))

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = db.relationship("User", back_populates="contracts")
    template = db.relationship("Template")
    signers = db.relationship(
        "Signer",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="Signer.order",
    )
    audit_logs = db.relationship(
        "AuditLog",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="AuditLog.created_at",
    )

    @property
    def status_enum(self) -> ContractStatus:
        return ContractStatus(self.status)

    @property
    def signed_count(self) -> int:
        return sum(1 for s in self.signers if s.status == SignerStatus.SIGNED.value)

    @property
    def total_signers(self) -> int:
        return len(self.signers)

    @property
    def progress_percent(self) -> int:
        if not self.signers:
            return 0
        return int(self.signed_count / self.total_signers * 100)

    def is_fully_signed(self) -> bool:
        return self.signers and all(s.status == SignerStatus.SIGNED.value for s in self.signers)


class Signer(db.Model):
    __tablename__ = "signers"

    id = db.Column(db.Integer, primary_key=True)
    contract_id = db.Column(db.Integer, db.ForeignKey("contracts.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    company = db.Column(db.String(160))
    role = db.Column(db.String(60), default="counterparty")  # internal / counterparty / witness
    order = db.Column(db.Integer, default=1, nullable=False)
    status = db.Column(db.String(20), default=SignerStatus.PENDING.value, nullable=False)
    access_token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))

    signed_at = db.Column(db.DateTime)
    signature_image_path = db.Column(db.String(500))
    signature_text = db.Column(db.String(120))
    signed_ip = db.Column(db.String(64))
    signed_user_agent = db.Column(db.String(255))
    signature_hash = db.Column(db.String(128))  # 署名値（HMAC）

    contract = db.relationship("Contract", back_populates="signers")

    @property
    def status_enum(self) -> SignerStatus:
        return SignerStatus(self.status)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    contract_id = db.Column(db.Integer, db.ForeignKey("contracts.id"), nullable=False, index=True)
    actor = db.Column(db.String(160), nullable=False)  # ユーザー名または署名者メール
    action = db.Column(db.String(80), nullable=False)  # created / sent / signed / declined / completed ...
    detail = db.Column(db.Text)
    ip_address = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    contract = db.relationship("Contract", back_populates="audit_logs")
