"""HTTP レベルのスモークテスト（ログイン・画面表示・SMS認証フロー）."""
from daiko.extensions import db
from daiko.models import Customer


def test_health(client):
    assert client.get("/healthz").json == {"status": "ok"}


def test_landing(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "代行の窓口".encode() in r.data


def test_manifest_and_sw(client):
    assert client.get("/manifest.webmanifest").status_code == 200
    assert client.get("/sw.js").status_code == 200


def test_customer_sms_login_flow(client, app):
    # コード送信（console: 画面にコードが返る）
    r = client.post("/auth/customer/login", data={"phone": "08099998888"})
    assert r.status_code == 200
    with client.session_transaction() as sess:
        code = sess["_otp"]["code"]
    # コード検証 → プロフィールへリダイレクト（新規）
    r = client.post("/auth/customer/verify", data={"phone": "08099998888", "code": code})
    assert r.status_code == 302
    with app.app_context():
        assert Customer.query.filter_by(phone="08099998888").first() is not None


def test_driver_login_and_dashboard(client, seed_data):
    r = client.post("/auth/driver/login", data={"phone": "09000000001", "password": "pass123"})
    assert r.status_code == 302
    r = client.get("/d/")
    assert r.status_code == 200
    assert "近くの依頼".encode() in r.data


def test_admin_login_required(client):
    # 未ログインは管理画面に入れずログインへ
    r = client.get("/admin/", follow_redirects=False)
    assert r.status_code == 302
    assert "/auth/admin/login" in r.headers["Location"]


def test_admin_login_and_dashboard(client, seed_data):
    r = client.post("/auth/admin/login", data={"login_id": "admin", "password": "adminpass"})
    assert r.status_code == 302
    r = client.get("/admin/")
    assert r.status_code == 200
    assert "ダッシュボード".encode() in r.data


def test_admin_delete_request_route(client, app, seed_data):
    """管理者の削除ルートが実際に機能する（モジュール名衝突の回帰防止）."""
    from daiko.extensions import db
    from daiko.models import Driver, Request
    from daiko.services import matching

    with app.app_context():
        rid = matching.create_request(seed_data["customer_id"], {
            "origin_lat": 36.5, "origin_lng": 139.9, "origin_label": "A",
            "dest_lat": 36.6, "dest_lng": 139.9, "dest_label": "B",
            "transmission": "AT", "handle": "right",
        }).id

    with client.session_transaction() as s:
        s["admin_id"] = seed_data["admin_id"]
    r = client.post(f"/admin/request/{rid}/delete", follow_redirects=True)
    body = r.get_data(as_text=True)
    assert "削除しました" in body
    assert "失敗" not in body
    with app.app_context():
        assert db.session.get(Request, rid) is None
