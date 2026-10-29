"""
Real email delivery via SendGrid's HTTP API (api.sendgrid.com/v3/mail/send)
using the already-present `httpx` client — no vendor SDK added, same
"no new third-party SDK" spirit as this module's original smtplib design.

Why HTTP instead of SMTP (2026-10-29): this app's primary deployment is
Render's free web service tier, which blocks all outbound traffic to SMTP
ports 25/465/587 as of September 2025 (see Render's own changelog:
"free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports").
smtplib-based sending therefore failed there with a hard
"[Errno 101] Network is unreachable" regardless of how correct the SMTP
credentials were -- it was never a credentials problem. SendGrid's API is
plain HTTPS (port 443), which Render's free tier does not block.

Credentials: SENDGRID_API_KEY (a Mail Send-scoped API key from a verified
Single Sender -- no custom domain required; see SendGrid's Single Sender
Verification). The "from" identity keeps the SMTP_FROM_EMAIL/SMTP_FROM_NAME
env var names from this project's original SMTP design (already configured
on this deployment) even though sending no longer goes over SMTP -- it's
still just "the address/name mail appears to come from."

Honesty rule this module follows (matching the rest of this project): if
SendGrid isn't configured, or the send genuinely fails, this returns a
clear `EmailSendResult(sent=False, reason=...)` -- it never pretends an
email went out. Callers (see auth_service.register_user) must not let a
failed or skipped send break account creation; email delivery is
best-effort and reported honestly, not silently swallowed.
"""
import logging
import os
from dataclasses import dataclass

import httpx

logger = logging.getLogger("nlp_nexus.email")

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"
SENDGRID_TIMEOUT_SECONDS = 10


def email_is_configured() -> bool:
    """True only when enough real SendGrid config is present to attempt a
    send. Read fresh from the environment each call so tests can
    monkeypatch os.environ without reimporting the module."""
    api_key = os.getenv("SENDGRID_API_KEY", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
    return bool(api_key and from_email)


@dataclass
class EmailSendResult:
    sent: bool
    # Present only when sent=False — an honest, specific reason rather than
    # a generic failure flag: "not_configured" (no SendGrid env vars set)
    # or "smtp_error" (a real send attempt was made and failed). Kept as
    # "smtp_error" rather than renamed, since every caller/test already
    # matches on this exact string and it still means the same thing:
    # "a real send was attempted and the provider rejected or failed it."
    reason: str | None = None
    detail: str | None = None


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> EmailSendResult:
    if not email_is_configured():
        logger.warning(
            "Email to %s ('%s') was not sent: SendGrid is not configured. Set SENDGRID_API_KEY "
            "and SMTP_FROM_EMAIL to enable real delivery.",
            to_email,
            subject,
        )
        return EmailSendResult(sent=False, reason="not_configured")

    api_key = os.getenv("SENDGRID_API_KEY", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "NeuroNLP Nexus").strip()

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_email, "name": from_name},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": text_body},
            {"type": "text/html", "value": html_body},
        ],
    }

    try:
        response = httpx.post(
            SENDGRID_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=SENDGRID_TIMEOUT_SECONDS,
        )
        # SendGrid returns 202 Accepted with an empty body on success —
        # anything else is a real failure (bad/unverified sender, invalid
        # key, rate limit, malformed recipient, ...).
        if response.status_code == 202:
            logger.info("Sent email to %s ('%s') via SendGrid", to_email, subject)
            return EmailSendResult(sent=True)
        # Never log the API key; the response body (SendGrid's own error
        # detail) is safe and useful for diagnosing a misconfigured sender.
        detail = response.text[:500]
        logger.error(
            "Failed to send email to %s ('%s'): SendGrid returned %s: %s",
            to_email,
            subject,
            response.status_code,
            detail,
        )
        return EmailSendResult(sent=False, reason="smtp_error", detail=f"HTTP {response.status_code}: {detail}")
    except Exception as exc:  # noqa: BLE001 — any network/HTTP failure must degrade gracefully
        logger.error("Failed to send email to %s ('%s'): %s", to_email, subject, exc)
        return EmailSendResult(sent=False, reason="smtp_error", detail=str(exc))
