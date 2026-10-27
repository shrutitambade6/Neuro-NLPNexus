"""
Real SMTP email delivery — no third-party email API SDK added, since
Python's standard-library `smtplib` can talk to any SMTP provider (Gmail
with an app password, SendGrid/Mailgun/Resend/SES's SMTP relay, a
company mail server, etc.) without a new dependency. All credentials are
read from environment variables and never touch the frontend or any API
response body.

Honesty rule this module follows (matching the rest of this project):
if SMTP isn't configured, or the send genuinely fails, this returns a
clear `EmailSendResult(sent=False, reason=...)` — it never pretends an
email went out. Callers (see auth_service.register_user) must not let a
failed or skipped send break account creation; email delivery is
best-effort and reported honestly, not silently swallowed.
"""
import logging
import os
import smtplib
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("nlp_nexus.email")

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587") or "587")
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "").strip() or SMTP_USERNAME
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "NeuroNLP Nexus").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false"
SMTP_TIMEOUT_SECONDS = 10


def email_is_configured() -> bool:
    """True only when enough real SMTP credentials are present to attempt
    a send. Read fresh from the environment each call so tests can
    monkeypatch os.environ without reimporting the module."""
    host = os.getenv("SMTP_HOST", "").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or username
    return bool(host and username and password and from_email)


@dataclass
class EmailSendResult:
    sent: bool
    # Present only when sent=False — an honest, specific reason rather than
    # a generic failure flag: "not_configured" (no SMTP env vars set) or
    # "smtp_error" (a real send attempt was made and failed).
    reason: str | None = None
    detail: str | None = None


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> EmailSendResult:
    if not email_is_configured():
        logger.warning(
            "Email to %s ('%s') was not sent: SMTP is not configured. Set SMTP_HOST, "
            "SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM_EMAIL to enable real delivery.",
            to_email,
            subject,
        )
        return EmailSendResult(sent=False, reason="not_configured")

    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587") or "587")
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or username
    from_name = os.getenv("SMTP_FROM_NAME", "NeuroNLP Nexus").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false"

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = to_email
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(host, port, timeout=SMTP_TIMEOUT_SECONDS) as server:
            if use_tls:
                server.starttls()
            server.login(username, password)
            server.sendmail(from_email, [to_email], message.as_string())
        logger.info("Sent email to %s ('%s')", to_email, subject)
        return EmailSendResult(sent=True)
    except Exception as exc:  # noqa: BLE001 — any SMTP/network failure must degrade gracefully
        logger.error("Failed to send email to %s ('%s'): %s", to_email, subject, exc)
        return EmailSendResult(sent=False, reason="smtp_error", detail=str(exc))
