import secrets
from datetime import datetime

from flask_login import UserMixin
from sqlalchemy.orm import relationship
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


def _token(nbytes: int = 12) -> str:
    return secrets.token_urlsafe(nbytes)


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    forms = relationship("Form", back_populates="owner", cascade="all, delete-orphan")
    lists = relationship("SubscriberList", back_populates="owner", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="owner", cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Form(db.Model):
    __tablename__ = "forms"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    key = db.Column(db.String(32), unique=True, nullable=False, default=_token, index=True)
    target_email = db.Column(db.String(255), nullable=False)
    redirect_url = db.Column(db.String(1024), nullable=True)
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    honeypot_field = db.Column(db.String(64), default="_gotcha", nullable=False)
    forward_replies = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="forms")
    submissions = relationship(
        "Submission", back_populates="form", cascade="all, delete-orphan", order_by="Submission.created_at.desc()"
    )

    @property
    def endpoint_url(self) -> str:
        from flask import current_app
        return f"{current_app.config['APP_BASE_URL']}/f/{self.key}"


class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.Integer, db.ForeignKey("forms.id"), nullable=False, index=True)
    payload = db.Column(db.JSON, nullable=False)
    sender_email = db.Column(db.String(255), nullable=True)
    ip = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    is_spam = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    form = relationship("Form", back_populates="submissions")


class SubscriberList(db.Model):
    __tablename__ = "subscriber_lists"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    from_name = db.Column(db.String(255), nullable=True)
    from_email = db.Column(db.String(255), nullable=True)
    public_key = db.Column(db.String(32), unique=True, nullable=False, default=_token, index=True)
    confirm_required = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="lists")
    subscribers = relationship(
        "Subscriber", back_populates="list", cascade="all, delete-orphan", order_by="Subscriber.created_at.desc()"
    )
    campaigns = relationship("Campaign", back_populates="list", cascade="all, delete-orphan")


class Subscriber(db.Model):
    __tablename__ = "subscribers"
    __table_args__ = (db.UniqueConstraint("list_id", "email", name="uix_list_email"),)

    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey("subscriber_lists.id"), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default="active", nullable=False)  # active|unsubscribed|pending|bounced
    confirm_token = db.Column(db.String(32), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    unsubscribed_at = db.Column(db.DateTime, nullable=True)

    list = relationship("SubscriberList", back_populates="subscribers")


class Campaign(db.Model):
    __tablename__ = "campaigns"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    list_id = db.Column(db.Integer, db.ForeignKey("subscriber_lists.id"), nullable=False, index=True)
    subject = db.Column(db.String(512), nullable=False)
    body_html = db.Column(db.Text, nullable=True)
    body_text = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="draft", nullable=False)  # draft|sending|sent|failed
    sent_count = db.Column(db.Integer, default=0, nullable=False)
    failed_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    sent_at = db.Column(db.DateTime, nullable=True)

    owner = relationship("User", back_populates="campaigns")
    list = relationship("SubscriberList", back_populates="campaigns")
