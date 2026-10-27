"""
Builds the content of the "Account created successfully" email — pure
string templating, zero network/SMTP I/O, so it's unit-testable without a
mail server. app/services/email_service.py is the layer that actually
sends what this module builds, matching this project's algorithms
(pure) -> services (I/O + orchestration) convention.
"""
from datetime import datetime

PLATFORM_NAME = "NeuroNLP Nexus"


def build_account_created_email(
    *,
    username: str,
    email: str,
    created_at: datetime,
    verify_url: str | None,
    support_contact: str,
) -> tuple[str, str, str]:
    """Returns (subject, html_body, text_body) for the welcome email.

    `verify_url` is None when email verification is disabled (EMAIL_
    VERIFICATION_ENABLED=false) — in that case the email confirms account
    creation without a "Verify Email" call to action, matching the user's
    spec ("...a secure Verify Email / Activate Account button if email
    verification is enabled").
    """
    when = created_at.strftime("%B %d, %Y at %H:%M UTC")
    subject = f"Welcome to {PLATFORM_NAME} — your account is ready"

    verify_section_html = ""
    verify_section_text = ""
    if verify_url:
        verify_section_html = f"""
        <div style="text-align:center;margin:28px 0;">
          <a href="{verify_url}"
             style="background:#6366f1;color:#ffffff;text-decoration:none;padding:13px 30px;
                    border-radius:10px;font-weight:600;font-size:14px;display:inline-block;
                    font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
            Verify Email / Activate Account
          </a>
        </div>
        <p style="font-size:12px;color:#8b8fa3;text-align:center;word-break:break-all;
                  font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          Or paste this link into your browser:<br />{verify_url}
        </p>
        """
        verify_section_text = f"\nVerify your email to activate your account:\n{verify_url}\n"

    html_body = f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f9;
               font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:16px;overflow:hidden;
                        box-shadow:0 2px 12px rgba(20,20,43,0.08);">
            <tr>
              <td style="background:#111827;padding:24px 32px;">
                <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">
                  {PLATFORM_NAME}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">
                  Welcome, {username}! 🎉
                </p>
                <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
                  Your {PLATFORM_NAME} account was created successfully.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="background:#f9fafb;border-radius:10px;padding:4px 0;margin-bottom:20px;">
                  <tr>
                    <td style="padding:12px 16px;font-size:13px;color:#374151;">
                      <strong>Username:</strong> {username}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 16px 12px;font-size:13px;color:#374151;">
                      <strong>Email:</strong> {email}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 16px 12px;font-size:13px;color:#374151;">
                      <strong>Created:</strong> {when}
                    </td>
                  </tr>
                </table>
                {verify_section_html}
                <p style="margin:24px 0 0;padding:14px 16px;background:#fef3c7;border-radius:8px;
                          font-size:12px;color:#92400e;line-height:1.6;">
                  <strong>Security note:</strong> if you did not create this account, please
                  contact {support_contact} right away and do not click any links in this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">
                  This is an automated message from {PLATFORM_NAME}. Please don't reply to it directly.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    text_body = f"""Welcome to {PLATFORM_NAME}, {username}!

Your account was created successfully.

Username: {username}
Email: {email}
Created: {when}
{verify_section_text}
Security note: if you did not create this account, please contact
{support_contact} right away.

— {PLATFORM_NAME}
"""

    return subject, html_body, text_body


def build_password_reset_email(
    *,
    username: str,
    reset_url: str,
    support_contact: str,
) -> tuple[str, str, str]:
    """Returns (subject, html_body, text_body) for the "reset your password"
    email. Same pure-templating, zero-I/O shape as build_account_created_email
    above — app/services/email_service.py is what actually sends it."""
    subject = f"{PLATFORM_NAME} — reset your password"

    html_body = f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f9;
               font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:16px;overflow:hidden;
                        box-shadow:0 2px 12px rgba(20,20,43,0.08);">
            <tr>
              <td style="background:#111827;padding:24px 32px;">
                <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">
                  {PLATFORM_NAME}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">
                  Reset your password, {username}
                </p>
                <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
                  We received a request to reset the password on your {PLATFORM_NAME} account.
                  This link expires in 1 hour.
                </p>
                <div style="text-align:center;margin:28px 0;">
                  <a href="{reset_url}"
                     style="background:#6366f1;color:#ffffff;text-decoration:none;padding:13px 30px;
                            border-radius:10px;font-weight:600;font-size:14px;display:inline-block;
                            font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size:12px;color:#8b8fa3;text-align:center;word-break:break-all;">
                  Or paste this link into your browser:<br />{reset_url}
                </p>
                <p style="margin:24px 0 0;padding:14px 16px;background:#fef3c7;border-radius:8px;
                          font-size:12px;color:#92400e;line-height:1.6;">
                  <strong>Security note:</strong> if you did not request this, you can safely ignore
                  this email — your password will not change. If you're concerned, contact
                  {support_contact}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    text_body = f"""Reset your {PLATFORM_NAME} password, {username}

We received a request to reset the password on your account. This link expires in 1 hour:
{reset_url}

If you did not request this, you can safely ignore this email — your password will not change.
If you're concerned, contact {support_contact}.

— {PLATFORM_NAME}
"""

    return subject, html_body, text_body
