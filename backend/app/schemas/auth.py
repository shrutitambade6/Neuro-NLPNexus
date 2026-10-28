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

# Student/Teacher college-email requirement (2026-10-08). Every teacher
# account, and every VIT-category student account, is institutional,
# issued by Vidyalankar Institute of Technology -- this does NOT replace
# the username+password login from the milestone above (that stays
# exactly as-is), it adds one more required, validated field at signup so
# an account is provably tied to a real email identity.
#
# Production-Ready Email Verification milestone (2026-10-28). A General
# student (student_category="general") is no longer forced onto the
# institutional domain -- they may instead use a personal address from
# one of GENERAL_EMAIL_PROVIDERS. Teachers are ALWAYS forced server-side
# onto COLLEGE_EMAIL_DOMAIN regardless of what student_category value (if
# any) is submitted -- see RegisterRequest.validate_email below -- so a
# frontend-only restriction is never the only thing stopping a teacher
# signup from using a personal Gmail address.
COLLEGE_EMAIL_DOMAIN = "vit.edu.in"
GENERAL_EMAIL_PROVIDERS = ("gmail.com",)


class RegisterRequest(BaseModel):
    # Username/Password Authentication milestone (2026-10-07). Signup no
    # longer collects or requires an email at all — see
    # student-teacher-username-auth.md. The only identity fields now are
    # full_name (display only, never used for login/lookup), username
    # (the real login identity, unique case-insensitively), and a
    # password + its confirmation.
    full_name: str = Field(..., min_length=1, max_length=120)
    username: str = Field(..., min_length=3, max_length=64)
    # Email requirement (2026-10-08, extended 2026-10-28) -- required for
    # every signup. Stored on User.email (the column already exists, made
    # nullable by the username-only migration -- this just starts filling
    # it again, it was never dropped). Validated below: a teacher, or a
    # VIT-category student, must use @{COLLEGE_EMAIL_DOMAIN}; a General
    # student may instead use a personal address from
    # GENERAL_EMAIL_PROVIDERS. Field name kept as `college_email` (not
    # renamed to a generic `email`) so this stays a minimal, additive
    # change against every existing caller of this schema.
    college_email: str = Field(..., min_length=5, max_length=254)
    # Production-Ready Email Verification milestone (2026-10-28). Only
    # meaningful when account_type == "student": "vit" (default, the
    # original behavior) keeps the institutional-only requirement;
    # "general" allows a personal address instead. Teachers always behave
    # as "vit" regardless of what's submitted here -- see
    # validate_email below, which reads account_type (already validated
    # by the time model_validator runs field-by-field... see the
    # model_validator at the bottom of this class for the actual
    # cross-field enforcement, since a single field_validator can't see
    # account_type reliably across all Pydantic v2 validation orders).
    student_category: str = Field("vit", max_length=16)
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

    @field_validator("student_category")
    @classmethod
    def validate_student_category(cls, v: str) -> str:
        if v not in ("vit", "general"):
            raise ValueError('student_category must be "vit" or "general".')
        return v

    @field_validator("college_email")
    @classmethod
    def validate_college_email_shape(cls, v: str) -> str:
        # Shape-only check here (domain is cross-field — enforced below in
        # validate_email_domain, which is the only place that can see
        # account_type/student_category together).
        trimmed = v.strip().lower()
        if not _EMAIL_RE.match(trimmed):
            raise ValueError("Enter a valid email address.")
        return trimmed

    @model_validator(mode="after")
    def validate_email_domain(self) -> "RegisterRequest":
        # Production-Ready Email Verification milestone (2026-10-28).
        # Teachers are ALWAYS forced onto the institutional domain here,
        # server-side, regardless of student_category's submitted value —
        # this is the actual enforcement point; the frontend never even
        # shows a category choice for account_type="teacher", but this
        # check means that omission isn't the only thing stopping it.
        requires_college_domain = self.account_type == "teacher" or self.student_category == "vit"
        if requires_college_domain:
            if not self.college_email.endswith(f"@{COLLEGE_EMAIL_DOMAIN}"):
                raise ValueError(f"Use your college email address (must end in @{COLLEGE_EMAIL_DOMAIN}).")
        else:
            provider_domains = tuple(f"@{p}" for p in GENERAL_EMAIL_PROVIDERS)
            if not self.college_email.endswith(provider_domains):
                providers_list = " or ".join(GENERAL_EMAIL_PROVIDERS)
                raise ValueError(f"Use a personal email address ending in {providers_list}.")
        return self

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

    @model_validator(mode="after")
    def normalize_student_category_for_non_students(self) -> "RegisterRequest":
        # A teacher signup never actually has a meaningful category — keep
        # it at the default "vit" value rather than letting the client
        # send an opinion that's discarded. Purely cosmetic/consistency;
        # validate_email_domain above is what actually enforces the
        # teacher-is-always-institutional rule, independent of this.
        if self.account_type != "student":
            self.student_category = "vit"
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
    # Production-Ready Email Verification milestone (2026-10-28).
    # Optional now: when a brand-new account requires verification and
    # isn't verified yet, register_user issues NO session/token at all
    # (no silent "activate on signup" bypass) — the frontend must treat a
    # response with access_token=None as "registered, check your email,"
    # never as "logged in."
    access_token: str | None = None
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
