"""
Small, named constants for the Super Admin Portal's authentication/
security surface — login rate limiting, the "suspicious activity"
heuristic, and the three real account-status values. Kept separate from
app/algorithms/moderation.py (which is about chat/discussion content, not
authentication) and from app/algorithms/auth.py (pure crypto, no policy
numbers), so each file answers one question.

Nothing here is a hidden magic number: every constant is also surfaced,
read live (not copy-pasted), on the Super Admin Settings page — see
app/services/superadmin_service.get_settings.
"""

# Login attempts are DB-backed (a count query against LoginActivity),
# same reasoning as moderation.py's chat rate limit: survives a backend
# restart, consistent with this project never keeping request-relevant
# state only in memory.
LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10
LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60  # 15 minutes

# A lower, separate threshold for the Security page's "suspicious
# activity" flag — deliberately below the hard lockout number above, so
# an account/IP shows up as "worth a look" before it's actually blocked.
SUSPICIOUS_FAILED_LOGIN_THRESHOLD = 5
SUSPICIOUS_ACTIVITY_WINDOW_SECONDS = 15 * 60

# The only three values User.account_status is ever set to. "active" is
# the default for every account (student, teacher, and the Super Admin
# itself). Only a Super Admin can move a STUDENT or TEACHER account
# between these three — never a super_admin account, and never itself
# (see superadmin_service._assert_manageable_target) so there's no path
# to a Super Admin locking out the only Super Admin account.
ACCOUNT_STATUSES = ("active", "suspended", "deactivated")

ACCOUNT_STATUS_LOGIN_MESSAGES = {
    "suspended": "Your account has been suspended. Contact your platform administrator.",
    "deactivated": "This account has been deactivated. Contact your platform administrator.",
}

# Super Admin sessions are deliberately shorter-lived than every other
# account's (TOKEN_EXPIRES_SECONDS, 24h) — this is the platform's most
# sensitive role, so a stolen/forgotten token has a much smaller window
# of use. Combined with UserSession-based revocation (see auth_service),
# this gives the Super Admin Portal real "automatic session expiration",
# not just the same 24h everyone else gets.
SUPER_ADMIN_SESSION_LIFETIME_SECONDS = 60 * 60 * 2  # 2 hours
