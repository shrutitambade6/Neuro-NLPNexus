from datetime import datetime, timezone

from app.algorithms.email_templates import PLATFORM_NAME, build_account_created_email


def _built(verify_url="https://app.example.com/verify-email?token=abc123", support="support@example.com"):
    return build_account_created_email(
        username="shruti",
        email="shruti@example.com",
        created_at=datetime(2026, 9, 29, 14, 30, tzinfo=timezone.utc),
        verify_url=verify_url,
        support_contact=support,
    )


def test_subject_mentions_platform_name():
    subject, _, _ = _built()
    assert PLATFORM_NAME in subject


def test_html_and_text_include_user_details():
    _, html_body, text_body = _built()
    for body in (html_body, text_body):
        assert "shruti" in body
        assert "shruti@example.com" in body
        assert "2026" in body  # created_at is rendered somewhere


def test_html_includes_verify_button_when_url_given():
    _, html_body, text_body = _built(verify_url="https://app.example.com/verify-email?token=xyz")
    assert "Verify Email" in html_body
    assert "https://app.example.com/verify-email?token=xyz" in html_body
    assert "https://app.example.com/verify-email?token=xyz" in text_body


def test_no_verify_button_when_verification_disabled():
    _, html_body, text_body = _built(verify_url=None)
    assert "Verify Email" not in html_body
    assert "Verify Email" not in text_body


def test_includes_security_note_with_support_contact():
    _, html_body, text_body = _built(support="help@nlp-nexus.example")
    assert "help@nlp-nexus.example" in html_body
    assert "help@nlp-nexus.example" in text_body
    assert "did not create this account" in html_body.lower() or "did not create this account" in text_body.lower()


def test_falls_back_to_generic_support_contact():
    _, html_body, _ = _built(support="your platform administrator")
    assert "your platform administrator" in html_body
