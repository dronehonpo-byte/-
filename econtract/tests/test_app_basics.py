def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}


def test_landing(client):
    r = client.get("/")
    assert r.status_code in (200, 302)


def test_login_page_renders(client):
    r = client.get("/auth/login")
    assert r.status_code == 200
    assert "ログイン".encode("utf-8") in r.data


def test_register_then_login(client, app):
    r = client.post("/auth/register", data={
        "email": "user1@test.local",
        "name": "ユーザー1",
        "password": "password1234",
        "password2": "password1234",
    }, follow_redirects=True)
    assert r.status_code == 200

    # 登録直後はログイン状態でダッシュボードへ
    r = client.get("/dashboard")
    assert r.status_code == 200
