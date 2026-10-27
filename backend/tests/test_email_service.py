"""
Tests app.services.email_service without ever touching a real network or
mail server: `email_is_configured` is exercised via monkeypatched env
vars, and `send_email`'s SMTP success/failure paths are exercised by
monkeypatching smtplib.SMTP itself with a fake context manager — this
proves the module builds and sends a real MIME message through the
smtplib API correctly, without requiring outbound network access (which
this project's own sandbox doesn't reliably have — see the Machine
Translation lab's honest handling of the same constraint).
"""
import smtplib

import pytest

from app.services import email_service


def _clear_smtp_env(monkeypatch):
    for key in ("SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME", "SMTP_PORT", "SMTP_USE_TLS"):
        monkeypatch.delenv(key, raising=False)


def _set_smtp_env(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "bot@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "super-secret")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "bot@example.com")
    monkeypatch.setenv("SMTP_FROM_NAME", "NeuroNLP Nexus")


def test_email_is_configured_false_when_no_env_vars(monkeypatch):
    _clear_smtp_env(monkeypatch)
    assert email_service.email_is_configured() is False


def test_email_is_configured_true_when_all_required_vars_set(monkeypatch):
    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch)
    assert email_service.email_is_configured() is True


def test_email_is_configured_false_when_password_missing(monkeypatch):
    _clear_smtp_env(monkeypatch)
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USERNAME", "bot@example.com")
    # no SMTP_PASSWORD
    assert email_service.email_is_configured() is False


def test_send_email_reports_not_configured_without_crashing(monkeypatch):
    _clear_smtp_env(monkeypatch)
    result = email_service.send_email("someone@example.com", "Subject", "<p>hi</p>", "hi")
    assert result.sent is False
    assert result.reason == "not_configured"


class _FakeSMTP:
    """Stands in for smtplib.SMTP as a context manager, recording calls so
    the test can assert the module talks to smtplib the way a real SMTP
    send requires (starttls -> login -> sendmail)."""

    instances = []

    def __init__(self, host, port, timeout=None):
        self.host = host
        self.port = port
        self.calls = []
        _FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False

    def starttls(self):
        self.calls.append("starttls")

    def login(self, username, password):
        self.calls.append(("login", username, password))

    def sendmail(self, from_addr, to_addrs, message_string):
        self.calls.append(("sendmail", from_addr, to_addrs))
        self.message_string = message_string


def test_send_email_success_path_calls_smtp_correctly(monkeypatch):
    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch)
    _FakeSMTP.instances = []
    monkeypatch.setattr(smtplib, "SMTP", _FakeSMTP)

    result = email_service.send_email("to@example.com", "Hello", "<p>Hello</p>", "Hello")

    assert result.sent is True
    assert result.reason is None
    assert len(_FakeSMTP.instances) == 1
    fake = _FakeSMTP.instances[0]
    assert fake.calls[0] == "starttls"
    assert fake.calls[1] == ("login", "bot@example.com", "super-secret")
    assert fake.calls[2][0] == "sendmail"
    assert "to@example.com" in fake.calls[2][2]
    assert "Hello" in fake.message_string


class _RaisingSMTP:
    def __init__(self, *args, **kwargs):
        raise smtplib.SMTPConnectError(421, "Could not connect")


def test_send_email_failure_path_returns_honest_reason_and_does_not_raise(monkeypatch):
    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch)
    monkeypatch.setattr(smtplib, "SMTP", _RaisingSMTP)

    result = email_service.send_email("to@example.com", "Hello", "<p>Hello</p>", "Hello")

    assert result.sent is False
    assert result.reason == "smtp_error"
    assert result.detail is not None
