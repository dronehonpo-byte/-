def test_console_backend_runs_silently(app):
    from econtract.services.email import EmailMessageData, send_email
    with app.app_context():
        ok = send_email(EmailMessageData(
            to="x@test.local",
            subject="hi",
            text="body",
        ))
        assert ok is True
