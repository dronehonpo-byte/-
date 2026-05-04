def test_google_login_disabled_redirects(client):
    r = client.get("/auth/google", follow_redirects=False)
    # OAuth 未設定 → ログイン画面に戻る
    assert r.status_code in (302, 303)
    assert "/auth/login" in r.headers.get("Location", "")
