"""
Super Admin Portal — RBAC enforcement, account management (status
transitions + session revocation + password-reset trigger), security
(login activity, rate limiting, suspicious activity, active sessions),
the immutable audit log, community moderation (privacy-gated report
content, resolution, suspend-on-resolve), and the read-only settings
endpoint (every value a live read of a real constant, never duplicated).
"""
from app.algorithms.auth import PBKDF2_ITERATIONS, hash_password, verify_password
from app.algorithms.moderation import RATE_LIMIT_MAX_ACTIONS
from app.algorithms.auth import decode_access_token
from app.algorithms.security_policy import (
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    SUPER_ADMIN_SESSION_LIFETIME_SECONDS,
    SUSPICIOUS_FAILED_LOGIN_THRESHOLD,
)
from app.services.auth_service import JWT_SECRET, TOKEN_EXPIRES_SECONDS
from app.services.admin_service import NEEDS_ATTENTION_STALE_DAYS, QUIZ_PASS_SCORE
from fastapi.testclient import TestClient

from app.main import app
from app.models.orm_models import User
from tests.conftest import TestSessionLocal, verify_and_login

client = TestClient(app)


def _register_and_token(email: str) -> str:
    username = email.split("@")[0]
    r = client.post(
        "/api/auth/register",
        json={"username": username, "full_name": "Test User", "college_email": f"{username}@vit.edu.in", "password": "hunter22pass", "confirm_password": "hunter22pass"},
    )
    assert r.status_code == 201, r.text
    # Production-Ready Email Verification milestone (2026-10-28) --
    # registration no longer issues a token for an unverified account;
    # this completes the real verify-email flow then logs in for a real
    # one. See tests/conftest.py's verify_and_login for the full comment.
    return verify_and_login(client, username)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _set_role(email: str, role: str) -> None:
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.username == (email).split("@")[0]).first()
        user.role = role
        if role == "super_admin":
            user.is_verified = True
        db.commit()
    finally:
        db.close()


def _user_id(email: str) -> int:
    db = TestSessionLocal()
    try:
        return db.query(User).filter(User.username == (email).split("@")[0]).first().id
    finally:
        db.close()


def _super_admin_token() -> str:
    token = _register_and_token("root@nexus.test")
    _set_role("root@nexus.test", "super_admin")
    return token


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------


def test_rbac_rejects_student_and_teacher_allows_super_admin():
    student_token = _register_and_token("stu1@nexus.test")
    teacher_token = _register_and_token("tch1@nexus.test")
    _set_role("tch1@nexus.test", "admin")
    admin_token = _super_admin_token()

    r = client.get("/api/superadmin/overview", headers=_auth(student_token))
    assert r.status_code == 403
    r = client.get("/api/superadmin/overview", headers=_auth(teacher_token))
    assert r.status_code == 403
    r = client.get("/api/superadmin/overview", headers=_auth(admin_token))
    assert r.status_code == 200


def test_unauthenticated_request_is_401():
    r = client.get("/api/superadmin/overview")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Overview + students/teachers
# ---------------------------------------------------------------------------


def test_overview_counts_reflect_real_data():
    admin_token = _super_admin_token()
    _register_and_token("stu2@nexus.test")
    _register_and_token("stu3@nexus.test")
    t_token = _register_and_token("tch2@nexus.test")
    _set_role("tch2@nexus.test", "admin")

    r = client.get("/api/superadmin/overview", headers=_auth(admin_token))
    assert r.status_code == 200
    stats = r.json()["stats"]
    assert stats["total_students"] == 2
    assert stats["total_teachers"] == 1


def test_student_list_and_detail_show_real_progress():
    admin_token = _super_admin_token()
    _register_and_token("stu4@nexus.test")

    r = client.get("/api/superadmin/students", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    student = body["students"][0]
    assert student["username"] == "stu4"
    assert student["nlp_progress_pct"] == 0
    assert "password" not in student and "password_hash" not in student

    detail_r = client.get(f"/api/superadmin/students/{student['id']}", headers=_auth(admin_token))
    assert detail_r.status_code == 200
    assert detail_r.json()["is_verified"] in (True, False)


def test_create_teacher_then_appears_in_teacher_list():
    admin_token = _super_admin_token()
    r = client.post(
        "/api/superadmin/teachers",
        json={"username": "newteacher", "email": "newteacher@nexus.test", "password": "teachpass123", "assigned_domain": "nlp"},
        headers=_auth(admin_token),
    )
    assert r.status_code == 201, r.text
    assert r.json()["assigned_domain"] == "nlp"

    list_r = client.get("/api/superadmin/teachers", headers=_auth(admin_token))
    emails = [t["email"] for t in list_r.json()["teachers"]]
    assert "newteacher@nexus.test" in emails

    # Duplicate email is rejected.
    dup_r = client.post(
        "/api/superadmin/teachers",
        json={"username": "another", "email": "newteacher@nexus.test", "password": "teachpass123"},
        headers=_auth(admin_token),
    )
    assert dup_r.status_code == 409


# ---------------------------------------------------------------------------
# Account status + session revocation + password reset
# ---------------------------------------------------------------------------


def test_suspend_blocks_login_and_revokes_existing_session_then_restore_works():
    admin_token = _super_admin_token()
    student_token = _register_and_token("stu5@nexus.test")
    student_id = _user_id("stu5@nexus.test")

    # The already-issued token works before suspension.
    assert client.get("/api/auth/me", headers=_auth(student_token)).status_code == 200

    r = client.patch(
        f"/api/superadmin/users/{student_id}/status",
        json={"status": "suspended", "reason": "Testing suspension flow."},
        headers=_auth(admin_token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["account_status"] == "suspended"

    # The existing session is now dead, even though the JWT itself hasn't expired.
    assert client.get("/api/auth/me", headers=_auth(student_token)).status_code == 401

    # And a fresh login attempt is refused with an honest reason.
    login_r = client.post("/api/auth/login", json={"username": ("stu5@nexus.test").split("@")[0], "password": "hunter22pass"})
    assert login_r.status_code == 401
    assert "suspended" in login_r.json()["detail"].lower()

    # Restoring lets them log in again.
    restore_r = client.patch(
        f"/api/superadmin/users/{student_id}/status",
        json={"status": "active", "reason": "Reviewed and restored."},
        headers=_auth(admin_token),
    )
    assert restore_r.status_code == 200
    login_again = client.post("/api/auth/login", json={"username": ("stu5@nexus.test").split("@")[0], "password": "hunter22pass"})
    assert login_again.status_code == 200


def test_super_admin_account_cannot_be_targeted():
    admin_token = _super_admin_token()
    other_admin_id = _user_id("root@nexus.test")

    r = client.patch(
        f"/api/superadmin/users/{other_admin_id}/status",
        json={"status": "suspended", "reason": "Should be refused."},
        headers=_auth(admin_token),
    )
    assert r.status_code == 400


def test_password_reset_trigger_is_audited_and_never_reveals_a_password():
    admin_token = _super_admin_token()
    _register_and_token("stu6@nexus.test")
    student_id = _user_id("stu6@nexus.test")

    r = client.post(f"/api/superadmin/users/{student_id}/reset-password", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    # College Email milestone (2026-10-08) -- every self-registered student
    # now has a real college email on file, so target.email is no longer a
    # reliable signal that this account is unreachable by mail. What
    # actually matters is whether this deployment can DELIVER an email at
    # all (email_is_configured()) -- no SMTP is configured in this test
    # environment (or, realistically, in this app's current deployment),
    # so trigger_password_reset falls back to the direct
    # temporary-password path exactly as it did for "no email on file":
    # otherwise the Super Admin would be left staring at
    # email_status="not_configured" with no way to actually help someone
    # locked out. See services/superadmin_service.py::trigger_password_reset.
    assert body["email_status"] == "no_email"
    assert body["temporary_password"]
    relogin = client.post("/api/auth/login", json={"username": "stu6", "password": body["temporary_password"]})
    assert relogin.status_code == 200

    audit_r = client.get("/api/superadmin/audit-log", headers=_auth(admin_token))
    actions = [e["action_type"] for e in audit_r.json()["entries"]]
    assert "password_reset_triggered" in actions


# ---------------------------------------------------------------------------
# Security: login activity, rate limiting, suspicious activity, sessions
# ---------------------------------------------------------------------------


def test_failed_logins_are_logged_flagged_suspicious_and_eventually_rate_limited():
    admin_token = _super_admin_token()
    _register_and_token("stu7@nexus.test")

    last_response = None
    for _ in range(LOGIN_RATE_LIMIT_MAX_ATTEMPTS + 2):
        last_response = client.post("/api/auth/login", json={"username": ("stu7@nexus.test").split("@")[0], "password": "wrong-password"})

    # Eventually the attempts themselves get rate-limited rather than just "wrong password".
    assert last_response.status_code == 401
    assert "too many" in last_response.json()["detail"].lower()

    sec_r = client.get("/api/superadmin/security/overview", headers=_auth(admin_token))
    assert sec_r.status_code == 200
    sec = sec_r.json()
    assert sec["failed_login_count_24h"] >= SUSPICIOUS_FAILED_LOGIN_THRESHOLD
    # email_attempted now stores the attempted USERNAME, not an email --
    # see auth_service._log_login_attempt's own comment.
    suspicious_usernames = [s["email_attempted"] for s in sec["suspicious"]]
    assert "stu7" in suspicious_usernames
    reasons = {a["failure_reason"] for a in sec["login_activity"] if a["email_attempted"] == "stu7"}
    assert "rate_limited" in reasons
    assert "bad_credentials" in reasons


def test_active_session_appears_and_can_be_revoked():
    admin_token = _super_admin_token()
    student_token = _register_and_token("stu8@nexus.test")

    sec_r = client.get("/api/superadmin/security/overview", headers=_auth(admin_token))
    sessions = sec_r.json()["active_sessions"]
    matching = [s for s in sessions if s["username"] == "stu8"]
    assert len(matching) == 1
    session_id = matching[0]["id"]

    assert client.get("/api/auth/me", headers=_auth(student_token)).status_code == 200

    revoke_r = client.delete(f"/api/superadmin/security/sessions/{session_id}", headers=_auth(admin_token))
    assert revoke_r.status_code == 200

    assert client.get("/api/auth/me", headers=_auth(student_token)).status_code == 401


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------


def test_audit_log_is_paginated_and_filterable_by_action_type():
    admin_token = _super_admin_token()
    _register_and_token("stu9@nexus.test")
    student_id = _user_id("stu9@nexus.test")
    client.patch(
        f"/api/superadmin/users/{student_id}/status",
        json={"status": "suspended", "reason": "for the audit log test"},
        headers=_auth(admin_token),
    )

    r = client.get("/api/superadmin/audit-log?action_type=account_status_changed", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert all(e["action_type"] == "account_status_changed" for e in body["entries"])
    assert all("password" not in (e["details"] or "").lower() for e in body["entries"])


# ---------------------------------------------------------------------------
# Community moderation: privacy-gated report content + resolution
# ---------------------------------------------------------------------------


def test_private_message_content_only_visible_through_a_filed_report_and_is_audited():
    admin_token = _super_admin_token()
    a_token = _register_and_token("mauth@nexus.test")
    b_token = _register_and_token("mrecv@nexus.test")
    b_id = _user_id("mrecv@nexus.test")

    convo_r = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(a_token))
    assert convo_r.status_code == 201
    conversation_id = convo_r.json()["conversation_id"]

    msg_r = client.post(
        f"/api/chat/conversations/{conversation_id}/messages",
        json={"content": "This is a private message that gets reported."},
        headers=_auth(a_token),
    )
    assert msg_r.status_code == 201
    message_id = msg_r.json()["id"]

    report_r = client.post(
        "/api/community/reports",
        json={"target_type": "message", "target_id": message_id, "reason": "Inappropriate content."},
        headers=_auth(b_token),
    )
    assert report_r.status_code == 201
    report_id = report_r.json()["id"]

    list_r = client.get("/api/superadmin/moderation/reports?status=open", headers=_auth(admin_token))
    assert any(rep["id"] == report_id for rep in list_r.json()["reports"])

    content_r = client.get(f"/api/superadmin/moderation/reports/{report_id}/content", headers=_auth(admin_token))
    assert content_r.status_code == 200
    assert content_r.json()["content"] == "This is a private message that gets reported."
    assert content_r.json()["author_username"] == "mauth"

    audit_r = client.get("/api/superadmin/audit-log?action_type=viewed_reported_content", headers=_auth(admin_token))
    assert audit_r.json()["total"] >= 1

    resolve_r = client.post(
        f"/api/superadmin/moderation/reports/{report_id}/resolve",
        json={"resolution": "reviewed", "note": "Confirmed, warned the user."},
        headers=_auth(admin_token),
    )
    assert resolve_r.status_code == 200

    after_r = client.get("/api/superadmin/moderation/reports?status=reviewed", headers=_auth(admin_token))
    assert any(rep["id"] == report_id for rep in after_r.json()["reports"])


def test_resolve_report_with_suspend_action_suspends_the_content_author():
    admin_token = _super_admin_token()
    author_token = _register_and_token("author@nexus.test")
    reporter_token = _register_and_token("reporter@nexus.test")
    author_id = _user_id("author@nexus.test")

    discussion_r = client.post(
        "/api/community/discussions",
        json={
            "title": "Spammy discussion",
            "description": "This is not really an NLP question.",
            "domain": "nlp",
            "topic": "General NLP",
        },
        headers=_auth(author_token),
    )
    assert discussion_r.status_code == 201
    discussion_id = discussion_r.json()["id"]

    report_r = client.post(
        "/api/community/reports",
        json={"target_type": "discussion", "target_id": discussion_id, "reason": "Spam."},
        headers=_auth(reporter_token),
    )
    report_id = report_r.json()["id"]

    resolve_r = client.post(
        f"/api/superadmin/moderation/reports/{report_id}/resolve",
        json={"resolution": "reviewed", "action": "suspend_user", "note": "Confirmed spam."},
        headers=_auth(admin_token),
    )
    assert resolve_r.status_code == 200

    db = TestSessionLocal()
    try:
        author = db.query(User).filter(User.id == author_id).first()
        assert author.account_status == "suspended"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Settings — every value a live read of a real constant
# ---------------------------------------------------------------------------


def test_settings_reflect_real_constants_not_duplicated_numbers():
    admin_token = _super_admin_token()
    r = client.get("/api/superadmin/settings", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["pbkdf2_iterations"] == PBKDF2_ITERATIONS == 600_000
    assert body["session_lifetime_hours"] == TOKEN_EXPIRES_SECONDS // 3600
    assert body["login_rate_limit_max_attempts"] == LOGIN_RATE_LIMIT_MAX_ATTEMPTS
    assert body["chat_rate_limit_max_actions"] == RATE_LIMIT_MAX_ACTIONS
    assert body["needs_attention_stale_days"] == NEEDS_ATTENTION_STALE_DAYS
    assert body["quiz_pass_score"] == QUIZ_PASS_SCORE
    assert isinstance(body["email_delivery_configured"], bool)


def test_settings_expose_super_admin_session_lifetime():
    admin_token = _super_admin_token()
    r = client.get("/api/superadmin/settings", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["super_admin_session_lifetime_hours"] == SUPER_ADMIN_SESSION_LIFETIME_SECONDS / 3600
    # Deliberately shorter than every other role's session.
    assert body["super_admin_session_lifetime_hours"] < body["session_lifetime_hours"]


# ---------------------------------------------------------------------------
# Super Admin sessions are short-lived by construction, not just by setting
# ---------------------------------------------------------------------------


def test_super_admin_login_issues_a_short_lived_token():
    email = "shortsession@nexus.test"
    _register_and_token(email)
    _set_role(email, "super_admin")

    r = client.post("/api/auth/login", json={"username": (email).split("@")[0], "password": "hunter22pass"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    payload = decode_access_token(token, JWT_SECRET)
    assert payload is not None
    lifetime = payload["exp"] - payload["iat"]
    assert lifetime == SUPER_ADMIN_SESSION_LIFETIME_SECONDS
    assert lifetime < TOKEN_EXPIRES_SECONDS


def test_student_login_still_gets_the_standard_long_session():
    email = "longsession@nexus.test"
    _register_and_token(email)

    r = client.post("/api/auth/login", json={"username": (email).split("@")[0], "password": "hunter22pass"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    payload = decode_access_token(token, JWT_SECRET)
    assert payload is not None
    lifetime = payload["exp"] - payload["iat"]
    assert lifetime == TOKEN_EXPIRES_SECONDS


# ---------------------------------------------------------------------------
# Learning activity aggregates
# ---------------------------------------------------------------------------


def test_learning_activity_endpoint_returns_real_shape():
    admin_token = _super_admin_token()
    r = client.get("/api/superadmin/learning-activity", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert "daily_activity" in body and "daily_community" in body
    assert body["total_quiz_attempts"] == 0
    assert body["quiz_pass_rate_pct"] == 0


# ---------------------------------------------------------------------------
# PBKDF2 backward compatibility
# ---------------------------------------------------------------------------


def test_pbkdf2_iteration_bump_is_backward_compatible():
    # A hash produced under the OLD 260_000-iteration setting (simulated
    # directly, since PBKDF2_ITERATIONS is now 600_000) must still verify —
    # existing accounts must never be locked out by this change.
    import hashlib
    import secrets as _secrets

    salt = _secrets.token_hex(16)
    old_digest = hashlib.pbkdf2_hmac("sha256", b"some-old-password", bytes.fromhex(salt), 260_000)
    old_style_hash = f"pbkdf2_sha256$260000${salt}${old_digest.hex()}"
    assert verify_password("some-old-password", old_style_hash) is True

    new_hash = hash_password("a-brand-new-password")
    assert "$600000$" in new_hash
    assert verify_password("a-brand-new-password", new_hash) is True
