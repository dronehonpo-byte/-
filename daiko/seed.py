"""プレビュー / デモ環境用の初期データ投入（冪等）.

Vercel など「DBが揮発するサーバーレス環境」でも、起動時にこれを呼べば
管理者・参加業者・デモ依頼（料金提示2件）が揃ったブラウズ可能な状態になる。
本番運用では `flask seed` を使う想定で、こちらはあくまでデモ補助。
"""
from __future__ import annotations

from .extensions import db
from .models import (
    Admin,
    Customer,
    Driver,
    Request,
    RequestStatus,
    Vendor,
    VendorStatus,
)
from .services import matching
from .services.sms import normalize_phone

# デモ用ドライバーの共通パスワード（プレビューで実際にログインできるよう固定値）
DEMO_DRIVER_PASSWORD = "demo123"
DEMO_CUSTOMER_PHONE = "090-1111-2222"


def ensure_seed(app, *, demo: bool = True) -> None:
    """初期データを冪等に投入する。既に存在すれば何もしない。"""
    with app.app_context():
        db.create_all()

        admin_id = app.config["ADMIN_ID"]
        if Admin.query.filter_by(login_id=admin_id).first() is None:
            admin = Admin(login_id=admin_id)
            admin.set_password(app.config["ADMIN_PASSWORD"] or "adminpass")
            db.session.add(admin)
            db.session.commit()

        emp = _ensure_vendor("エンペラー代行", "090-2496-3656", "090-2496-3656",
                             "確定後のキャンセルは1,500円",
                             payment_methods="cash,visa,master,jcb,ic,paypay")
        sak = _ensure_vendor("さくら運転代行", "028-600-1234", "090-3333-4444",
                             "確定後30分以内は1,000円",
                             payment_methods="cash,paypay,dpay")

        if not demo:
            return

        cust_phone = normalize_phone(DEMO_CUSTOMER_PHONE)
        cust = Customer.query.filter_by(phone=cust_phone).first()
        if cust is None:
            cust = Customer(phone=cust_phone, display_name="山田 太郎")
            db.session.add(cust)
            db.session.commit()

        # 募集中/エントリーありの依頼が無ければ、デモ依頼＋2社の提示を作る
        active = (
            Request.query.filter_by(customer_id=cust.id)
            .filter(Request.status.in_([RequestStatus.RECRUITING, RequestStatus.ENTERED]))
            .first()
        )
        if active is None:
            req = matching.create_request(cust.id, {
                "origin_lat": 36.55861, "origin_lng": 139.89829,
                "origin_label": "宇都宮駅西口 ロータリー",
                "dest_lat": 36.52, "dest_lng": 139.95,
                "dest_label": "宇都宮市 ゆいの杜 4丁目",
                "car_type": "トヨタ アルファード", "transmission": "AT", "handle": "right",
                "asap": True, "note": "白いミニバンです。子ども用シートあり。",
            })
            emp_driver = Driver.query.filter_by(vendor_id=emp.id).first()
            sak_driver = Driver.query.filter_by(vendor_id=sak.id).first()
            if emp_driver:
                matching.add_entry(req.id, emp_driver, price=3200, eta_minutes=12,
                                   cancellation_fee="確定後のキャンセルは1,500円")
            if sak_driver:
                matching.add_entry(req.id, sak_driver, price=2800, eta_minutes=18,
                                   cancellation_fee="確定後30分以内は1,000円")


def _ensure_vendor(name: str, vendor_phone: str, driver_phone: str, policy: str,
                   payment_methods: str = "") -> Vendor:
    vendor = Vendor.query.filter_by(name=name).first()
    if vendor is None:
        vendor = Vendor(
            name=name,
            phone=normalize_phone(vendor_phone),
            status=VendorStatus.APPROVED,
            cancellation_policy=policy,
            payment_methods=payment_methods or None,
        )
        db.session.add(vendor)
        db.session.flush()
    else:
        # デモ業者は承認済みを維持し、支払い方法が未設定なら補完
        vendor.status = VendorStatus.APPROVED
        if payment_methods and not vendor.payment_methods:
            vendor.payment_methods = payment_methods
    # ドライバーは存在確認のうえ、デモ用パスワード(demo123)を毎回セット（冪等）
    dphone = normalize_phone(driver_phone)
    driver = Driver.query.filter_by(phone=dphone).first()
    if driver is None:
        driver = Driver(vendor_id=vendor.id, name=f"{name} ドライバー", phone=dphone)
        db.session.add(driver)
    driver.vendor_id = vendor.id
    driver.active = True
    driver.set_password(DEMO_DRIVER_PASSWORD)
    db.session.commit()
    return vendor
