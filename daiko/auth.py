"""ロール別のセッション認証ヘルパー.

3種類の利用者（お客様 / ドライバー / 管理者）を1つのアプリで扱うため、
Flask-Login の単一ユーザーモデルではなくセッションキーで独立管理する。
"""
from __future__ import annotations

from functools import wraps

from flask import flash, g, redirect, request, session, url_for

from .models import Admin, Customer, Driver

CUSTOMER_KEY = "customer_id"
DRIVER_KEY = "driver_id"
ADMIN_KEY = "admin_id"


# ── ログイン / ログアウト ──
def login_customer(customer: Customer) -> None:
    session[CUSTOMER_KEY] = customer.id


def login_driver(driver: Driver) -> None:
    session[DRIVER_KEY] = driver.id


def login_admin(admin: Admin) -> None:
    session[ADMIN_KEY] = admin.id


def logout(role: str) -> None:
    session.pop({"customer": CUSTOMER_KEY, "driver": DRIVER_KEY, "admin": ADMIN_KEY}[role], None)


# ── 現在のユーザー取得 ──
def current_customer() -> Customer | None:
    cid = session.get(CUSTOMER_KEY)
    return db_get(Customer, cid) if cid else None


def current_driver() -> Driver | None:
    did = session.get(DRIVER_KEY)
    return db_get(Driver, did) if did else None


def current_admin() -> Admin | None:
    aid = session.get(ADMIN_KEY)
    return db_get(Admin, aid) if aid else None


def db_get(model, pk):
    from .extensions import db

    return db.session.get(model, pk)


# ── デコレータ ──
def customer_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        c = current_customer()
        if c is None:
            return _redirect_login("auth.customer_login")
        g.customer = c
        return view(*args, **kwargs)

    return wrapper


def driver_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        d = current_driver()
        if d is None:
            return _redirect_login("auth.driver_login")
        g.driver = d
        return view(*args, **kwargs)

    return wrapper


def admin_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        a = current_admin()
        if a is None:
            return _redirect_login("auth.admin_login")
        g.admin = a
        return view(*args, **kwargs)

    return wrapper


def _redirect_login(endpoint: str):
    flash("ログインしてください。", "warning")
    return redirect(url_for(endpoint, next=request.path))
