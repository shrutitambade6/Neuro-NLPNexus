"""
Tests app.services.email_service without ever touching a real network:
`email_is_configured` is exercised via monkeypatched env vars, and
`send_email`'s SendGrid HTTP success/failure paths are exercised by
monkeypatching httpx.post itself with a fake response object -- this
proves the module builds the SendGrid payload and interprets its HTTP
response correctly, without requiring outbound network access (this
project's sandbox doesn't reliably have it -- see the Machine Translation
lab's honest handling of the same constraint).

Why HTTP instead of SMTP: Render's free web service tier blocks outbound
traffic to SMTP ports 25/465/587 (see email_service.py's own module
docstring), so this module was rewritten to send via SendGrid's plain-
HTTPS Mail Send API instead. These tests were rewritten to match.
"""
import httpx
import pytest

from app.services import email_service


def _clear_sendgrid_env(monkeypatch):
    for key in ("SENDGRID_API_KEY", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME"):
        monkeypatch.delenv(key, raising=False)


def _set_sendgrid_env(monkeypatch):
    monkeypatch.setenv("SENDGRID_API_KEY", "SG.fake-api-key")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "bot@example.com")
    monkeypatch.setenv("SMTP_FROM_NAME", "NeuroNLP Nexus")


def test_email_is_configured_false_when_no_env_vars(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    assert email_service.email_is_configured() is False


def test_email_is_configured_true_when_all_required_vars_set(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    _set_sendgrid_env(monkeypatch)
    assert email_service.email_is_configured() is True


def test_email_is_configured_false_when_from_email_missing(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    monkeypatch.setenv("SENDGRID_API_KEY", "SG.fake-api-key")
    # no SMTP_FROM_EMAIL
    assert email_service.email_is_configured() is False


def test_email_is_configured_false_when_api_key_missing(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    monkeypatch.setenv("SMTP_FROM_EMAIL", "bot@example.com")
    # no SENDGRID_API_KEY
    assert email_service.email_is_configured() is False


def test_send_email_reports_not_configured_without_crashing(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    result = email_service.send_email("someone@example.com", "Subject", "<p>hi</p>", "hi")
    assert result.sent is False
    assert result.reason == "not_configured"


class _FakeResponse:
    """Stands in for an httpx.Response, carrying just what send_email reads."""

    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text


def test_send_email_success_path_calls_sendgrid_correctly(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    _set_sendgrid_env(monkeypatch)

    calls = []

    def _fake_post(url, json=None, headers=None, timeout=None):
        calls.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
        return _FakeResponse(202)

    monkeypatch.setattr(httpx, "post", _fake_post)

    result = email_service.send_email("to@example.com", "Hello", "<p>Hello</p>", "Hello")

    assert result.sent is True
    assert result.reason is None
    assert len(calls) == 1
    call = calls[0]
    assert call["url"] == email_service.SENDGRID_API_URL
    assert call["headers"]["Authorization"] == "Bearer SG.fake-api-key"
    assert call["json"]["personalizations"][0]["to"][0]["email"] == "to@example.com"
    assert call["json"]["from"]["email"] == "bot@example.com"
    assert call["json"]["from"]["name"] == "NeuroNLP Nexus"
    assert call["json"]["subject"] == "Hello"
    assert any(c["value"] == "Hello" for c in call["json"]["content"])


def test_send_email_failure_path_on_non_202_returns_honest_reason(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    _set_sendgrid_env(monkeypatch)

    def _fake_post(url, json=None, headers=None, timeout=None):
        return _FakeResponse(401, text="Unauthorized: bad API key")

    monkeypatch.setattr(httpx, "post", _fake_post)

    result = email_service.send_email("to@example.com", "Hello", "<p>Hello</p>", "Hello")

    assert result.sent is False
    assert result.reason == "smtp_error"
    assert "401" in result.detail
    assert "Unauthorized" in result.detail


def test_send_email_failure_path_on_network_exception_does_not_raise(monkeypatch):
    _clear_sendgrid_env(monkeypatch)
    _set_sendgrid_env(monkeypatch)

    def _raising_post(url, json=None, headers=None, timeout=None):
        raise httpx.ConnectError("Network is unreachable")

    monkeypatch.setattr(httpx, "post", _raising_post)

    result = email_service.send_email("to@example.com", "Hello", "<p>Hello</p>", "Hello")

    assert result.sent is False
    assert result.reason == "smtp_error"
    assert result.detail is not None
