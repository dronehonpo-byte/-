import pytest

from daiko import create_app
from daiko.config import TestingConfig
from daiko.extensions import db
from daiko.models import Admin, Customer, Driver, Vendor, VendorStatus


@pytest.fixture()
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def seed_data(app):
    """承認済み業者＋ドライバー2名＋お客様1名を投入."""
    with app.app_context():
        vendor = Vendor(name="エンペラー代行", phone="09024963656", status=VendorStatus.APPROVED)
        db.session.add(vendor)
        db.session.flush()
        d1 = Driver(vendor_id=vendor.id, name="ドライバーA", phone="09000000001")
        d1.set_password("pass123")
        d2 = Driver(vendor_id=vendor.id, name="ドライバーB", phone="09000000002")
        d2.set_password("pass123")
        admin = Admin(login_id="admin")
        admin.set_password("adminpass")
        customer = Customer(phone="08011112222", display_name="テスト客")
        db.session.add_all([d1, d2, admin, customer])
        db.session.commit()
        return {
            "vendor_id": vendor.id,
            "driver1_id": d1.id,
            "driver2_id": d2.id,
            "customer_id": customer.id,
            "admin_id": admin.id,
        }
