"""マッチングの心臓部（状態遷移・二重確定防止）のテスト."""
import pytest

from daiko.extensions import db
from daiko.models import Driver, EntryStatus, Request, RequestStatus
from daiko.services import matching
from daiko.services.matching import MatchingError

REQ_DATA = {
    "origin_lat": 36.55, "origin_lng": 139.88, "origin_label": "出発地",
    "dest_lat": 36.56, "dest_lng": 139.90, "dest_label": "目的地",
    "car_type": "普通", "transmission": "AT", "handle": "right", "via_count": 0, "asap": True,
}


def _make_request(app, seed_data):
    with app.app_context():
        req = matching.create_request(seed_data["customer_id"], dict(REQ_DATA))
        return req.id


def test_create_request_sets_recruiting_and_notifies(app, seed_data):
    rid = _make_request(app, seed_data)
    with app.app_context():
        req = db.session.get(Request, rid)
        assert req.status == RequestStatus.RECRUITING
        from daiko.models import Notification
        # 近隣ドライバー2名＋管理者1名へ通知
        assert Notification.query.filter_by(role="driver").count() == 2


def test_entry_moves_to_entered(app, seed_data):
    rid = _make_request(app, seed_data)
    with app.app_context():
        d1 = db.session.get(Driver, seed_data["driver1_id"])
        matching.add_entry(rid, d1, price=3000, eta_minutes=15)
        req = db.session.get(Request, rid)
        assert req.status == RequestStatus.ENTERED


def test_duplicate_entry_rejected(app, seed_data):
    rid = _make_request(app, seed_data)
    with app.app_context():
        d1 = db.session.get(Driver, seed_data["driver1_id"])
        matching.add_entry(rid, d1, price=3000, eta_minutes=15)
        with pytest.raises(MatchingError):
            matching.add_entry(rid, d1, price=2500, eta_minutes=10)


def test_confirm_locks_single_winner(app, seed_data):
    """確定後は他エントリーが不成立になり、再確定できない."""
    rid = _make_request(app, seed_data)
    with app.app_context():
        d1 = db.session.get(Driver, seed_data["driver1_id"])
        d2 = db.session.get(Driver, seed_data["driver2_id"])
        e1 = matching.add_entry(rid, d1, price=3000, eta_minutes=15)
        e2 = matching.add_entry(rid, d2, price=2800, eta_minutes=20)

        winner = matching.confirm_entry(rid, e2.id, seed_data["customer_id"])
        assert winner.status == EntryStatus.ACCEPTED

        req = db.session.get(Request, rid)
        assert req.status == RequestStatus.CONFIRMED
        assert req.confirmed_entry_id == e2.id
        from daiko.models import Entry
        assert db.session.get(Entry, e1.id).status == EntryStatus.REJECTED

        # 二重確定は拒否される
        with pytest.raises(MatchingError):
            matching.confirm_entry(rid, e1.id, seed_data["customer_id"])


def test_full_lifecycle(app, seed_data):
    rid = _make_request(app, seed_data)
    with app.app_context():
        d1 = db.session.get(Driver, seed_data["driver1_id"])
        e1 = matching.add_entry(rid, d1, price=3000, eta_minutes=15)
        matching.confirm_entry(rid, e1.id, seed_data["customer_id"])
        matching.start_progress(rid, d1.id)
        assert db.session.get(Request, rid).status == RequestStatus.IN_PROGRESS
        matching.complete(rid, d1.id)
        assert db.session.get(Request, rid).status == RequestStatus.COMPLETED


def test_cannot_entry_after_confirm(app, seed_data):
    rid = _make_request(app, seed_data)
    with app.app_context():
        d1 = db.session.get(Driver, seed_data["driver1_id"])
        d2 = db.session.get(Driver, seed_data["driver2_id"])
        e1 = matching.add_entry(rid, d1, price=3000, eta_minutes=15)
        matching.confirm_entry(rid, e1.id, seed_data["customer_id"])
        with pytest.raises(MatchingError):
            matching.add_entry(rid, d2, price=2000, eta_minutes=10)


def test_cancel_before_confirm(app, seed_data):
    rid = _make_request(app, seed_data)
    with app.app_context():
        matching.cancel(rid, by_role="customer", actor_id=seed_data["customer_id"])
        assert db.session.get(Request, rid).status == RequestStatus.CANCELLED


def test_auto_expire_after_ttl(app, seed_data):
    """締め切り時刻を過ぎた募集は時間切れになり、以後エントリーできない."""
    from datetime import datetime, timedelta

    rid = _make_request(app, seed_data)
    with app.app_context():
        req = db.session.get(Request, rid)
        # まだ募集中・残り時間あり
        assert req.status == RequestStatus.RECRUITING
        assert req.seconds_left > 0
        # 受付を TTL より前にずらして時間切れにする
        req.created_at = datetime.utcnow() - timedelta(
            seconds=Request.RECRUIT_TTL_SECONDS + 5
        )
        db.session.commit()
        assert req.is_time_expired is True
        assert matching.expire_if_stale(req) is True
        assert db.session.get(Request, rid).status == RequestStatus.EXPIRED
        # 二重呼び出しは何もしない
        assert matching.expire_if_stale(db.session.get(Request, rid)) is False
        # 時間切れ後はエントリー不可
        d1 = db.session.get(Driver, seed_data["driver1_id"])
        with pytest.raises(MatchingError):
            matching.add_entry(rid, d1, price=3000, eta_minutes=15)


def test_expire_all_stale_bulk(app, seed_data):
    from datetime import datetime, timedelta

    rid = _make_request(app, seed_data)
    with app.app_context():
        req = db.session.get(Request, rid)
        req.created_at = datetime.utcnow() - timedelta(
            seconds=Request.RECRUIT_TTL_SECONDS + 60
        )
        db.session.commit()
        assert matching.expire_all_stale() == 1
        assert db.session.get(Request, rid).status == RequestStatus.EXPIRED


def test_unapproved_vendor_cannot_entry(app, seed_data):
    from daiko.models import Vendor, VendorStatus

    rid = _make_request(app, seed_data)
    with app.app_context():
        v = db.session.get(Vendor, seed_data["vendor_id"])
        v.status = VendorStatus.PENDING
        db.session.commit()
        d1 = db.session.get(Driver, seed_data["driver1_id"])
        with pytest.raises(MatchingError):
            matching.add_entry(rid, d1, price=3000, eta_minutes=15)


def test_purge_request_removes_confirmed_request_and_children(app, seed_data):
    """確定・対応中のリクエストを関連データごと削除できる（Postgres相当のFK厳格下）."""
    from daiko.models import Entry, Notification

    with app.app_context():
        rid = matching.create_request(seed_data["customer_id"], dict(REQ_DATA)).id
        drv = db.session.get(Driver, seed_data["driver1_id"])
        e = matching.add_entry(rid, drv, 3000, 10)
        matching.confirm_entry(rid, e.id, seed_data["customer_id"])
        matching.start_progress(rid, drv.id)
        assert Entry.query.filter_by(request_id=rid).count() == 1
        assert Notification.query.filter_by(request_id=rid).count() > 0

        matching.purge_request(db.session.get(Request, rid))

        assert db.session.get(Request, rid) is None
        assert Entry.query.filter_by(request_id=rid).count() == 0
        assert Notification.query.filter_by(request_id=rid).count() == 0


def test_suspended_vendor_driver_cannot_login(app, seed_data, client):
    """停止した業者のドライバーはログインできない（管理者の停止が有効）."""
    from daiko.models import Vendor, VendorStatus

    with app.app_context():
        v = db.session.get(Vendor, seed_data["vendor_id"])
        v.status = VendorStatus.SUSPENDED
        db.session.commit()
    r = client.post("/auth/driver/login",
                    data={"phone": "09000000001", "password": "pass123"},
                    follow_redirects=True)
    body = r.get_data(as_text=True)
    assert "停止中" in body
    # ダッシュボードに入れていない（ログイン不可）
    assert "/d/" not in r.request.path or "login" in body
