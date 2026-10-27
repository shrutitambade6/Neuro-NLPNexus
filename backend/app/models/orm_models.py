"""
SQLAlchemy models for the schema proposed in Phase 1, plus the Student/
Teacher platform columns and tables added for the NLP/DL progress-tracking
and admin-dashboard milestone.
`users` (now with real auth columns — Milestone 17) and `experiments` are
wired to endpoints; the rest (challenges, progress, corpora, lexicon_entries)
are defined now so later phases can build on a stable schema without
migrations churn.

No migration tool (Alembic etc.) is set up in this project. For a brand
new `nlp_nexus.db`, `Base.metadata.create_all()` creates every table below
with its current columns — nothing special needed.

For an EXISTING `nlp_nexus.db` that predates a column added here (`role`,
`last_login` on `users`), `create_all()` alone will NOT retroactively add
it — `create_all()` only creates tables that don't exist yet, it never
alters an existing table. That's why `app/database.py` also runs a tiny,
additive, non-destructive SQLite migration (`ensure_additive_columns`) at
startup: it checks `PRAGMA table_info` and runs `ALTER TABLE ... ADD
COLUMN` for anything missing, so existing accounts and their passwords are
preserved rather than requiring the "just delete the db file" escape hatch
this file used to document. New tables (`learning_progress`,
`quiz_results`, `activity_log`) need no migration at all — `create_all()`
creates them the first time regardless of how old the rest of the db is.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """A DateTime column that is always tz-aware UTC on the Python side,
    on both write and read.

    SQLite (this project's database) silently drops tzinfo on every
    DateTime column round-trip -- confirmed empirically against a real
    copy of this project's own db (see the identical note this codebase
    already had in planner_service._as_aware_utc, which worked around it
    for the Study Planner feature only). Every column here is always
    written via the tz-aware utcnow() above, so the value is genuinely
    UTC the whole time -- it just loses its tzinfo label on the way back
    out of SQLite, becoming an ambiguous naive datetime.

    That ambiguity is what caused the "wrong time shown" bug: FastAPI/
    Pydantic serializes a naive datetime to JSON with no timezone suffix
    (e.g. "2026-10-08T18:22:00", no "Z", no "+00:00"), and a browser's
    `new Date(...)` parses an offset-less ISO string as LOCAL time rather
    than UTC -- so a message sent at 11:52 PM IST (18:22 UTC) displayed
    as "6:22 PM" instead of converting back to 11:52 PM.

    Re-attaching tzinfo here, once, at the type level, means every
    DateTime column in every model is always correctly tz-aware both
    in Python and in the JSON this app sends to the frontend -- not just
    the one column this bug was reported against.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, default="guest")
    # Username/Password Authentication milestone (2026-10-07). Email used
    # to be required+unique for every account; it is now OPTIONAL --
    # normal signup (student or teacher) never collects one at all, so
    # most rows have NULL here. Kept (not dropped) because other features
    # still use it when present: a Super-Admin-created teacher account
    # (CreateTeacherRequest) still sets one, and superadmin_service.
    # trigger_password_reset still uses the existing email-reset flow for
    # any account that has one. SQLite's UNIQUE constraint still applies
    # but never conflicts between NULLs, so this stays safe with many rows
    # having no email. See database.ensure_email_nullable for the
    # one-time migration that relaxes this column's NOT NULL constraint
    # on an existing on-disk database (this Column definition alone only
    # controls freshly-created tables).
    email = Column(String(254), unique=True, nullable=True)
    # Username/Password Authentication milestone. The one piece of real
    # identity signup now collects instead of email -- a display name,
    # never used for login/lookup/uniqueness (username is). Optional at
    # the column level only so existing rows created before this
    # milestone (which never collected it) don't fail a NOT NULL backfill;
    # RegisterRequest itself still requires it for every new signup.
    full_name = Column(String(120), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)
    # Milestone 18 — Account Creation & Email Verification. Verification
    # itself is stateless: rather than a stored token column, the "Verify
    # Email" link carries a short-lived signed JWT (purpose=verify_email),
    # reusing the same HS256 infra as login sessions. This column is the
    # only new persisted state, and it's what /auth/verify-email flips.
    is_verified = Column(Boolean, default=False, nullable=False)
    # Student/Teacher platform milestone. "student" for every account that
    # goes through /auth/register — that endpoint hardcodes role="student"
    # and has no role field in its request schema, so a public sign-up can
    # never produce an admin account. The one admin account is created out
    # of band by backend/scripts/seed_admin.py, reading ADMIN_EMAIL/
    # ADMIN_PASSWORD from the environment — there is no API endpoint that
    # changes a user's role, so an authenticated student has no path to
    # promote themselves either.
    role = Column(String(16), default="student", nullable=False)
    # Set on every successful login (see auth_service.login_user) — real,
    # not inferred — and what the admin dashboard's "active students" and
    # "last activity" figures are computed from.
    last_login = Column(UTCDateTime, nullable=True)
    # Super Admin Portal milestone. "active" for every account by default;
    # a Super Admin can move it to "suspended" (temporary, reversible via
    # "restore") or "deactivated" (the account's own choice to leave /
    # the Super Admin's longer-term action — also reversible, there is no
    # hard-delete anywhere in this flow). auth_service.login_user and
    # get_current_user both refuse anything but "active", so a change here
    # takes effect immediately — even mid-session, once that account's
    # existing sessions are revoked (see UserSession below).
    account_status = Column(String(16), default="active", nullable=False)
    # Teacher accounts only (role="admin"); a display/organizational hint
    # ("nlp" | "dl" | None for "both") set by the Super Admin when creating
    # or editing a teacher account. Deliberately NOT wired into the
    # Community/Chat milestone's existing "teachers see unanswered
    # questions in their subject" behavior (that still shows every admin
    # every domain's unanswered discussions, unchanged) — this is Super
    # Admin bookkeeping only, so adding it can't silently narrow what an
    # existing teacher already sees.
    assigned_domain = Column(String(8), nullable=True)
    # Student/Teacher self-serve signup follow-up (2026-10-07). Public
    # registration still can never directly create role="admin" (see the
    # comment on `role` above, and auth_service.register_user) -- picking
    # "Teacher" at signup instead flips this flag and leaves role as
    # "student" until a Super Admin reviews the request from the existing
    # Teachers screen (superadmin_service.approve_teacher_request /
    # reject_teacher_request). False for every account that never asked,
    # and cleared back to False the moment a decision is made either way
    # -- nothing stays "pending" forever.
    teacher_request_pending = Column(Boolean, default=False, nullable=False)
    # Birthday Experience milestone. Both optional — a birthday is never
    # required at signup (see schemas.auth.RegisterRequest) and a user who
    # skipped it, or later removes it via Settings, simply never triggers
    # the experience (app.services.birthday_service.is_birthday_today
    # returns False whenever birthday is None; nothing infers one).
    # `timezone` is an IANA zone name (e.g. "Asia/Kolkata"), captured once
    # client-side via Intl.DateTimeFormat().resolvedOptions().timeZone at
    # signup — it's what lets "today" mean the user's own calendar day
    # rather than the server's/UTC's (see birthday_service.local_today()).
    # Defaults to "UTC" so a row with no captured zone still behaves
    # sanely rather than crashing on a NULL.
    birthday = Column(Date, nullable=True)
    timezone = Column(String(64), nullable=False, default="UTC")
    # Study Planner milestone (2026-10-07). week_start: 0 = Sunday,
    # 1 = Monday (default -- matches the spec's own example week
    # "Sep 28 - Oct 4", which is a Monday-start week). heatmap_measure:
    # "hours" | "count", which the Month screen's heat tiles key off.
    # Both are plain per-user preferences, not planner data, so they live
    # on User rather than a new one-row-per-user settings table.
    planner_week_start = Column(Integer, nullable=False, default=1)
    planner_heatmap_measure = Column(String(8), nullable=False, default="hours")

    experiments = relationship("Experiment", back_populates="user")
    challenge_attempts = relationship("ChallengeAttempt", back_populates="user")
    progress_entries = relationship("LearningProgress", back_populates="user")
    # Digital Books milestone (theory migration) — see BookProgress below.
    book_progress_entries = relationship("BookProgress", back_populates="user")
    quiz_results = relationship("QuizResult", back_populates="user")
    activity_log_entries = relationship("ActivityLog", back_populates="user")


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module = Column(String(64), nullable=False)       # e.g. "ngram", "parsing"
    algorithm = Column(String(64), nullable=False)     # e.g. "bigram", "cyk"
    input_json = Column(JSON, nullable=False)
    output_json = Column(JSON, nullable=False)
    params_json = Column(JSON, default=dict)
    duration_ms = Column(Float, default=0.0)
    created_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", back_populates="experiments")


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True)
    module = Column(String(64), nullable=False)
    difficulty = Column(String(16), nullable=False)   # easy / medium / hard
    prompt_json = Column(JSON, nullable=False)
    answer_json = Column(JSON, nullable=False)
    xp_value = Column(Integer, default=10)


class ChallengeAttempt(Base):
    __tablename__ = "challenge_attempts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    correct = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    xp_awarded = Column(Integer, default=0)
    created_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", back_populates="challenge_attempts")


# The three tables below back the Student Progress Tracking / Teacher
# Dashboard milestone. Deliberately minimal (the user's own spec: "Do NOT
# create an unnecessarily complicated database") — three tables, no join
# tables, no separate "badges" table (badges are computed on the fly from
# these three, in app/algorithms/badges.py, rather than persisted — nothing
# here is ever written that isn't a direct record of something the student
# actually did).
#
# This replaces the old, unused `Progress`/"progress" model from Phase 1
# (never wired to any service or endpoint) rather than leaving two
# overlapping progress tables in the schema — nothing real depended on the
# old shape.
class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain = Column(String(8), nullable=False)  # "nlp" | "dl"
    module_id = Column(String(64), nullable=False)  # e.g. "dl-module-1"
    task_id = Column(String(64), nullable=False)  # the lesson/lab/task within that module
    status = Column(String(16), default="completed", nullable=False)  # not_started / in_progress / completed
    completion_percentage = Column(Integer, default=100, nullable=False)
    completed_at = Column(UTCDateTime, nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)
    updated_at = Column(UTCDateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="progress_entries")

    __table_args__ = (
        UniqueConstraint("user_id", "domain", "module_id", "task_id", name="uq_learning_progress_entry"),
    )


class BookProgress(Base):
    """
    Reading progress + bookmark for the Interactive Learning Books (the
    "Theory -> Books" migration). Deliberately its own table rather than
    reusing LearningProgress: the dashboard's nlp/dl completion percentage,
    badges, and the admin/teacher analytics all assume LearningProgress.domain
    is exactly "nlp" or "dl" and module_id is one of progress_catalog.py's
    trackable lessons — overloading that table with book chapters would
    quietly corrupt those numbers. This table follows the exact same
    per-user, per-trackable-unit, status+timestamp pattern instead (see
    app/algorithms/book_catalog.py for the chapter catalog it validates
    against, and app/services/book_progress_service.py for the service
    that reads/writes it) — new surface, same architecture.
    """
    __tablename__ = "book_progress"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(String(8), nullable=False)  # "nlp" | "dl"
    chapter_id = Column(String(64), nullable=False)  # a book_catalog.py chapter id
    completed = Column(Boolean, default=False, nullable=False)
    bookmarked = Column(Boolean, default=False, nullable=False)
    last_page_in_chapter = Column(Integer, default=0, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)
    updated_at = Column(UTCDateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="book_progress_entries")

    __table_args__ = (
        UniqueConstraint("user_id", "book_id", "chapter_id", name="uq_book_progress_entry"),
    )


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain = Column(String(8), nullable=False)  # "nlp" | "dl"
    quiz_id = Column(String(64), nullable=False)
    score = Column(Integer, nullable=False)  # percentage, 0-100
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    attempted_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", back_populates="quiz_results")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # lesson_complete / lab_complete / task_complete / quiz_attempt / badge_earned
    activity_type = Column(String(32), nullable=False)
    domain = Column(String(8), nullable=True)  # "nlp" | "dl" | None
    activity_reference = Column(String(128), nullable=True)  # module_id/task_id, quiz_id, or badge key
    detail = Column(String(255), nullable=True)  # short human-readable summary for the activity feed
    timestamp = Column(UTCDateTime, default=utcnow)

    user = relationship("User", back_populates="activity_log_entries")


class Corpus(Base):
    __tablename__ = "corpora"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    language = Column(String(16), nullable=False)  # en / hi / mr
    content = Column(Text, nullable=False)
    is_builtin = Column(Boolean, default=False)


class LexiconEntry(Base):
    __tablename__ = "lexicon_entries"

    id = Column(Integer, primary_key=True)
    word = Column(String(128), nullable=False, index=True)
    language = Column(String(16), nullable=False)
    definitions_json = Column(JSON, default=list)
    synonyms_json = Column(JSON, default=list)
    hypernyms_json = Column(JSON, default=list)
    hyponyms_json = Column(JSON, default=list)


# ---------------------------------------------------------------------------
# Community / Chat milestone — private 1:1 messaging + subject-focused
# doubt-solving discussions. Kept to the minimum real tables the feature
# needs (the user's own instruction, echoing the Teacher Dashboard
# milestone's "do not create an unnecessarily complicated database"): no
# separate "rooms" table (a domain/topic pair IS the room, same as the
# existing LearningProgress.domain convention), no persisted online-status
# column (presence is tracked live in app/services/connection_manager.py —
# it is real, just not something that belongs on disk), no markdown/HTML
# storage (content is always plain text — see app/algorithms/moderation.py
# — so there is nothing to sanitize against XSS because nothing is ever
# rendered as HTML).
#
# Private chat and subject discussions are deliberately two separate table
# pairs (Conversation/Message vs Discussion/DiscussionReply) rather than one
# generic "thread" system — mixing A<->B private messaging with
# community-visible Q&A under one model would immediately tangle the
# privacy rules (teachers must never see private student<->student
# messages, but subject discussions are visible to the whole learning
# community) into one giant permission check instead of "which table is
# this" being the answer by construction.


class Conversation(Base):
    """A private 1:1 conversation between exactly two users. Always stored
    with user_a_id < user_b_id (enforced in chat_service, not just by
    convention) so looking up "the conversation between X and Y" never has
    to check both orderings or risk creating two rows for the same pair."""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    user_a_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_b_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)
    # Denormalized for the conversation list's sort order — real, kept in
    # sync by chat_service.send_message every time a message is persisted,
    # not a separate "last activity" guess.
    last_message_at = Column(UTCDateTime, nullable=True)

    user_a = relationship("User", foreign_keys=[user_a_id])
    user_b = relationship("User", foreign_keys=[user_b_id])
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_a_id", "user_b_id", name="uq_conversation_pair"),
    )


class Message(Base):
    """A single message in a private conversation. `read_at` is set when
    the OTHER participant reads it (a 1:1 conversation has exactly one
    possible reader per message, so no separate read-receipts table is
    needed). `deleted` is a soft delete — the row (and the fact a message
    once existed there) stays, but content is blanked by the service layer
    on display, matching "allow users to delete their own messages" without
    corrupting the other participant's view of the conversation's shape."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)
    edited_at = Column(UTCDateTime, nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    read_at = Column(UTCDateTime, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class Discussion(Base):
    """A subject-focused doubt/discussion, the unit the "Community" section
    is built around. `topic` is validated against the fixed catalog in
    app/algorithms/community_catalog.py (same finite-catalog approach as
    progress_catalog.py) rather than accepting arbitrary free text, and
    `linked_module_id` — when present — is one of that catalog's own
    module/lab keys, so a discussion can point straight back at, e.g., the
    Parsing Lab rather than just naming it in prose."""

    __tablename__ = "discussions"

    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    domain = Column(String(8), nullable=False)  # "nlp" | "dl"
    topic = Column(String(64), nullable=False)
    linked_module_id = Column(String(64), nullable=True)
    status = Column(String(16), default="open", nullable=False)  # open | answered
    # use_alter=True: discussions <-> discussion_replies is a genuine FK
    # cycle (a discussion points at its accepted reply; a reply points back
    # at its discussion). Without this, SQLAlchemy can still CREATE both
    # tables (it just picks an order) but warns/fails trying to sort them
    # for DROP (e.g. in tests' per-test drop_all). use_alter tells it to
    # add this one FK via a separate ALTER step instead of inline, which
    # breaks the cycle for both create and drop ordering.
    accepted_reply_id = Column(
        Integer,
        ForeignKey("discussion_replies.id", use_alter=True, name="fk_discussions_accepted_reply_id"),
        nullable=True,
    )
    deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)
    updated_at = Column(UTCDateTime, default=utcnow, onupdate=utcnow)

    author = relationship("User", foreign_keys=[author_id])
    replies = relationship(
        "DiscussionReply",
        back_populates="discussion",
        cascade="all, delete-orphan",
        foreign_keys="DiscussionReply.discussion_id",
    )


class DiscussionReply(Base):
    """One reply in a discussion's thread. Whether it is the accepted
    answer is NOT a column here — it's derived from
    Discussion.accepted_reply_id so there is exactly one source of truth
    for "which reply is accepted" rather than two columns that could ever
    disagree."""

    __tablename__ = "discussion_replies"

    id = Column(Integer, primary_key=True)
    discussion_id = Column(Integer, ForeignKey("discussions.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)
    edited_at = Column(UTCDateTime, nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)

    discussion = relationship("Discussion", back_populates="replies", foreign_keys=[discussion_id])
    author = relationship("User", foreign_keys=[author_id])


class SavedDiscussion(Base):
    """A user's bookmark of a discussion, backing the "Saved Discussions"
    section. A plain join table — no extra columns — because there is
    nothing else real to store about a bookmark."""

    __tablename__ = "saved_discussions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    discussion_id = Column(Integer, ForeignKey("discussions.id"), nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "discussion_id", name="uq_saved_discussion"),
    )


class ReplyReaction(Base):
    """A single "Helpful" reaction on a reply, one per (reply, user) pair —
    deliberately one reaction type, not a social-media reaction picker."""

    __tablename__ = "reply_reactions"

    id = Column(Integer, primary_key=True)
    reply_id = Column(Integer, ForeignKey("discussion_replies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("reply_id", "user_id", name="uq_reply_reaction"),
    )


class Notification(Base):
    """A real, persisted notification — message | reply | mention |
    accepted_answer | teacher_response (the original five kinds the spec
    asked for), plus birthday | birthday_wish (Birthday Experience
    milestone — see app/services/birthday_service.py; reuses this same
    table/columns rather than a parallel notifications system).
    `reference_type` + `reference_id` point at the conversation,
    discussion, or — for "birthday" — the birthday user themself ("user")
    that the notification is about, so the frontend can route a click
    straight there without a second lookup table."""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # recipient
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # who triggered it, if anyone
    notif_type = Column(String(32), nullable=False)
    reference_type = Column(String(16), nullable=False)  # "conversation" | "discussion" | "user"
    reference_id = Column(Integer, nullable=False)
    content = Column(String(255), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])


class Report(Base):
    """A moderation report against a message/discussion/reply/user. Visible
    only to the admin account (require_admin, same as every other teacher
    endpoint) — there is no student-facing moderation queue."""

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String(16), nullable=False)  # message | discussion | reply | user
    target_id = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(16), default="open", nullable=False)  # open | reviewed | dismissed
    created_at = Column(UTCDateTime, default=utcnow)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(UTCDateTime, nullable=True)

    reporter = relationship("User", foreign_keys=[reporter_id])


class Block(Base):
    """blocker_id has blocked blocked_id from starting/sending private
    messages. Does not affect visibility of that user's public discussion
    replies — blocking is about unwanted private contact, not about
    erasing someone's contribution to a public, teacher-visible thread."""

    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True)
    blocker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    blocked_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_block_pair"),
    )


class AuditLog(Base):
    """An immutable record of every sensitive Super Admin action — account
    creation, status changes, role changes, password-reset triggers,
    moderation actions, and reported-content views. "Immutable" is an
    application-level guarantee, not a DB-level one (SQLite has no
    row-level write-once enforcement): nothing in app/services/
    superadmin_service.py ever UPDATEs or DELETEs a row here, and no API
    endpoint exposes an edit/delete path for this table at all — the only
    operations are INSERT (every logged action) and SELECT (the Audit Log
    page). `details` is a short, human-readable summary (never secrets —
    no password, hash, or token is ever written into it)."""

    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # the Super Admin who acted
    action_type = Column(String(48), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    details = Column(String(500), nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)

    actor = relationship("User", foreign_keys=[actor_id])
    target_user = relationship("User", foreign_keys=[target_user_id])


class LoginActivity(Base):
    """One row per login attempt, success or failure — the raw data behind
    the Security section's "login attempts / failed login attempts /
    suspicious activity" views. `user_id` is null for a failed attempt
    against an email with no matching account (never let a login failure
    reveal whether the account exists, same honesty rule auth_service
    already follows elsewhere — but the attempt itself is still worth
    recording, since a flood of attempts against unknown emails is itself
    a signal)."""

    __tablename__ = "login_activity"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email_attempted = Column(String(254), nullable=False)
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(64), nullable=True)  # "bad_credentials" | "account_suspended" | "rate_limited" | ...
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", foreign_keys=[user_id])


class UserSession(Base):
    """One row per issued access token (keyed by its JWT `jti` claim) —
    what makes "active sessions" and "log this device out" real rather
    than cosmetic. The JWT itself is still what's checked on every request
    (self-contained, no DB hit needed to verify the signature/expiry), but
    auth_service.get_current_user additionally checks this table so a
    session a Super Admin has revoked, or that belonged to an account that
    has since been suspended/deactivated, stops working immediately
    instead of silently remaining valid until the token's own `exp`."""

    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    jti = Column(String(64), unique=True, nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)
    expires_at = Column(UTCDateTime, nullable=False)
    revoked_at = Column(UTCDateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])


# ---------------------------------------------------------------------------
# Study Planner milestone (2026-10-07) -- a brand-new feature (Day/Dashboard,
# Week, and Month screens) built additively alongside the existing NLP/DL
# learning platform. Nothing above this point was touched to add it; these
# are all new tables, so Base.metadata.create_all() creates them on both a
# fresh and an existing nlp_nexus.db with no migration helper needed (only
# the two new columns on User, above, needed one -- see _ADDITIVE_COLUMNS
# in app/database.py).
# ---------------------------------------------------------------------------


class PlannerCategory(Base):
    __tablename__ = "planner_categories"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(64), nullable=False)
    # A named accent key (see schemas.planner.CATEGORY_COLORS), not a raw
    # hex -- the frontend owns the actual color values, so a palette tweak
    # is a frontend-only change, never a data migration.
    color = Column(String(16), nullable=False, default="lavender")
    created_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", foreign_keys=[user_id])


class PlannerTask(Base):
    __tablename__ = "planner_tasks"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("planner_categories.id"), nullable=True)
    priority = Column(String(8), nullable=False, default="medium")  # "low" | "medium" | "high"
    status = Column(String(8), nullable=False, default="todo")  # "todo" | "working" | "done"
    due_date = Column(Date, nullable=False)
    # Both local-wall-clock, naive, interpreted in the viewer's own
    # calendar day (due_date) -- deliberately NOT a UTC datetime, the same
    # "never blind UTC" lesson this project already learned the hard way
    # from the Birthday Experience's date-input bugs (see
    # teacher-dashboard-and-community-chat-milestones.md). A task with no
    # start_minute is the spec's "No time" row.
    start_minute = Column(Integer, nullable=True)  # minutes since local midnight, 0-1439
    duration_minutes = Column(Integer, nullable=True)
    completed_at = Column(UTCDateTime, nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", foreign_keys=[user_id])
    category = relationship("PlannerCategory")


class PlannerTaskSession(Base):
    """One row per 'working' interval -- opened when a task's status
    flips to 'working' (planner_service.set_task_status), closed when it
    flips away from 'working' to anything else. What the Dashboard's
    Focus time card actually sums, rather than inferring focus time from
    status alone (a task can sit in 'working' for days without someone
    actually focused on it the whole time -- only real open/close events
    count)."""

    __tablename__ = "planner_task_sessions"

    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("planner_tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(UTCDateTime, default=utcnow)  # real UTC instant -- unlike due_date/start_minute, elapsed focus time needs true wall-clock duration
    ended_at = Column(UTCDateTime, nullable=True)  # null = still open/"working" right now

    task = relationship("PlannerTask")


class PlannerHabit(Base):
    __tablename__ = "planner_habits"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)

    user = relationship("User", foreign_keys=[user_id])


class PlannerHabitCheck(Base):
    __tablename__ = "planner_habit_checks"

    id = Column(Integer, primary_key=True)
    habit_id = Column(Integer, ForeignKey("planner_habits.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_planner_habit_check_habit_date"),)
