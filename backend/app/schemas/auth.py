import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# A real (if not exhaustive RFC 5322) shape check — deliberately not using
# pydantic's EmailStr, which needs the optional email-validator package
# that isn't in requirements.txt. This still genuinely rejects malformed
# input, it just doesn't claim full RFC coverage. Still used by the
# legacy-email endpoints below (forgot-password / resend-verification),
# just no longer by RegisterRequest/LoginRequest — see the Username/
# Password Authentication milestone (2026-10-07).
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

_USERNAME_RE = re.compile(r"^[A-Za-z0-9_]+$")

# Student/Teacher college-email requirement (2026-10-08). Every real
# student/teacher account here is institutional, issued by Vidyalankar
# Institute of Technology -- this does NOT replace the username+password
# login from the milestone above (that stays exactly as-is), it adds one
# more required, validated field at signup so an account is provably tied
# to a real college identity. Both account_type values ("student" and
# "teacher") use the same single institutional domain -- there is no
# separate teacher-only domain.
COLLEGE_EMAIL_DOMAIN = "vit.edu.in"


class RegisterRequest(BaseModel):
    # Username/Password Authentication milestone (2026-10-07). Signup no
    # longer collects or requires an email at all — see
    # student-teacher-username-auth.md. The only identity fields now are
    # full_name (display only, never used for login/lookup), username
    # (the real login identity, unique case-insensitively), and a
    # password + its confirmation.
    full_name: str = Field(..., min_length=1, max_length=120)
    username: str = Field(..., min_length=3, max_length=64)
    # College-email requirement (2026-10-08) -- required for every signup,
    # both account_type values. Validated below to be a real-shaped email
    # ending in @{COLLEGE_EMAIL_DOMAIN}; stored on User.email (the column
    # already exists, made nullable by the username-only migration -- this
    # just starts filling it again, it was never dropped).
    college_email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    # Birthday Experience milestone — both genuinely optional (point 1 of
    # the spec: signup must succeed with neither field present). `timezone`
    # is the browser's IANA zone name (Intl.DateTimeFormat().
    # resolvedOptions().timeZone), sent once at signup so the backend can
    # later tell whether "today" is the user's birthday in THEIR calendar
    # day, not the server's. A missing/invalid value just falls back to
    # UTC in auth_service.register_user — never a hard signup failure.
    birthday: date | None = None
    timezone: str | None = Field(None, max_length=64)
    # Student/Teacher self-serve signup follow-up (2026-10-07). Deliberately
    # does NOT let a signup set `role` directly -- see auth_service.
    # register_user, which only ever reads this to flip
    # `teacher_request_pending`; role itself is still always hardcoded to
    # "student" there, same security boundary as before this field existed.
    account_type: str = Field("student", max_length=16)

    @field_validator("account_type")
    @classmethod
    def validate_account_type(cls, v: str) -> str:
        if v not in ("student", "teacher"):
            raise ValueError('account_type must be "student" or "teacher".')
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Full name is required.")
        return trimmed

    @field_validator("username")
    @classmethod
    def validate_username_chars(cls, v: str) -> str:
        # Trim unnecessary spaces first (spec requirement) — a username
        # that's only whitespace fails the regex below, same as before.
        trimmed = v.strip()
        if not _USERNAME_RE.match(trimmed):
            raise ValueError("Username can only contain letters, numbers, and underscores.")
        return trimmed

    @field_validator("college_email")
    @classmethod
    def validate_college_email(cls, v: str) -> str:
        trimmed = v.strip().lower()
        if not _EMAIL_RE.match(trimmed):
            raise ValueError("Enter a valid email address.")
        if not trimmed.endswith(f"@{COLLEGE_EMAIL_DOMAIN}"):
            raise ValueError(f"Use your college email address (must end in @{COLLEGE_EMAIL_DOMAIN}).")
        return trimmed

    @field_validator("birthday")
    @classmethod
    def validate_birthday_not_future(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("Birthday can't be in the future.")
        return v

    @model_validator(mode="after")
    def validate_passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class LoginRequest(BaseModel):
    # Username/Password Authentication milestone (2026-10-07) — replaces
    # the old email+password login entirely. See auth_service.login_user.
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)
    # Student/Teacher self-serve signup follow-up (2026-10-07). Optional
    # and None by default so any other caller of this endpoint (if one
    # ever exists) keeps working unchanged -- when the frontend DOES send
    # it, auth_service.login_user rejects a mismatch (e.g. "Teacher"
    # selected on a role="student" account) even though the password was
    # correct, with its own specific, logged failure_reason.
    account_type: str | None = Field(None, max_length=16)

    @field_validator("username")
    @classmethod
    def validate_username_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Username is required.")
        return trimmed

    @field_validator("account_type")
    @classmethod
    def validate_account_type(cls, v: str | None) -> str | None:
        if v is not None and v not in ("student", "teacher"):
            raise ValueError('account_type must be "student" or "teacher".')
        return v


class UsernameAvailabilityResponse(BaseModel):
    # Real-time signup availability check (spec section 1) — a plain GET,
    # no auth required (same privacy level as "does this account exist"
    # checks elsewhere in this file, which already don't require auth).
    available: bool


class UserOut(BaseModel):
    id: int
    username: str
    # Username/Password Authentication milestone (2026-10-07) — both now
    # optional. A normal signup never sets either (full_name is collected
    # but see below — actually full_name IS collected at signup and is
    # always present for a new account; email is the one that's now
    # routinely absent). Kept as `| None` rather than removed because
    # existing/legacy and admin-created accounts may still have a real
    # email on file.
    email: str | None = None
    full_name: str | None = None
    created_at: datetime
    is_verified: bool = False
    # "student" for every account created via /auth/register (that endpoint
    # has no role field and hardcodes role="student" — see auth_service.
    # register_user). "admin" only ever comes from the seeded account.
    role: str = "student"
    # Student/Teacher self-serve signup follow-up — true only between
    # signing up with "Teacher" selected and a Super Admin's decision; see
    # User.teacher_request_pending's own comment. Lets Register.tsx/
    # Settings show an honest "awaiting approval" state instead of the
    # account silently staying a student forever with no explanation.
    teacher_request_pending: bool = False

    model_config = ConfigDict(from_attributes=True)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)


class ForgotPasswordResponse(BaseModel):
    # Deliberately the same message whether or not the email has an
    # account — matching this file's existing resend-verification pattern
    # of never revealing account existence through the response shape.
    message: str = "If that email has an account, a password reset link has been sent."


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    # Populated only by /auth/register (login leaves this None — nothing to
    # report there). Honest, specific values from email_service.EmailSendResult:
    # "sent" | "not_configured" | "smtp_error" | "disabled" (verification off).
    # The frontend uses this to decide whether the post-signup toast says
    # "check your email" or something more honest about email not going out.
    email_status: str | None = None


class VerifyEmailResponse(BaseModel):
    verified: bool
    message: str
    user: UserOut


class ResendVerificationRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)


class ResendVerificationResponse(BaseModel):
    email_status: str
    message: str


class ChangePasswordRequest(BaseModel):
    # Requires the real current password, verified server-side against the
    # real password hash (see auth_service.change_password) — this is not a
    # "trust the client" form; a stolen/left-open session still can't
    # change the password without knowing it.
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordResponse(BaseModel):
    message: str
