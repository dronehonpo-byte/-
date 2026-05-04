"""サイン署名サービスとフロー全体テスト."""
import io
from pathlib import Path

import pytest


def _signup(client):
    return client.post("/auth/register", data={
        "email": "u1@test.local",
        "name": "U1",
        "password": "password1234",
        "password2": "password1234",
    }, follow_redirects=True)


def test_text_sha256_stable(app):
    from econtract.services.signing import text_sha256
    with app.app_context():
        assert text_sha256("hello") == text_sha256("hello")
        assert text_sha256("hello") != text_sha256("world")


def test_signature_hash_uses_secret(app):
    from econtract.services.signing import make_signature_hash
    with app.test_request_context():
        h1 = make_signature_hash("a", "b")
        h2 = make_signature_hash("a", "b")
        h3 = make_signature_hash("a", "c")
    assert h1 == h2
    assert h1 != h3
    assert len(h1) == 64  # sha256 hex


def test_create_contract_then_send(client, app):
    _signup(client)

    r = client.post("/contracts/new", data={
        "title": "テスト契約",
        "description": "説明",
        "body": "第1条 テスト\n本契約は試験用である。\n\n第2条 終わり",
        "signer_name[]": "外部 太郎",
        "signer_email[]": "external@test.local",
        "signer_company[]": "外部株式会社",
        "signer_role[]": "counterparty",
    }, follow_redirects=True)
    assert r.status_code == 200

    # 契約詳細
    from econtract.models import Contract, Signer
    with app.app_context():
        c = Contract.query.first()
        assert c is not None
        assert c.title == "テスト契約"
        assert len(c.signers) == 1
        signer = c.signers[0]

    # 送信 → ステータス変化 + audit log
    r = client.post(f"/contracts/{c.id}/send", follow_redirects=True)
    assert r.status_code == 200
    with app.app_context():
        c2 = Contract.query.get(c.id)
        assert c2.status == "sent"
        actions = [log.action for log in c2.audit_logs]
        assert "sent" in actions

    # 公開URLでアクセス → ページが返る
    r = client.get(f"/sign/{signer.access_token}")
    assert r.status_code == 200
    assert "テスト契約".encode("utf-8") in r.data

    # 署名 POST
    r = client.post(f"/sign/{signer.access_token}/sign", data={
        "agree": "1",
        "signature_text": "外部 太郎",
        "signature_image": "",
    }, follow_redirects=True)
    assert r.status_code == 200

    with app.app_context():
        c3 = Contract.query.get(c.id)
        assert c3.status == "completed"
        assert c3.completed_at is not None
        assert c3.signers[0].status == "signed"
        assert c3.signers[0].signature_hash and len(c3.signers[0].signature_hash) == 64
        assert c3.sealed_pdf_path
        assert Path(c3.sealed_pdf_path).exists()
