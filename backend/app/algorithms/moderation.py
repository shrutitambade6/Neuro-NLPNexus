"""
Small, honest helpers shared by chat_service and community_service:
content validation, @mention extraction, and rate-limit thresholds.

No HTML/markdown rendering anywhere in this feature — every message,
discussion, and reply is stored and displayed as plain text (React/JSX
text nodes escape by construction), so there is no HTML to sanitize
against XSS in the first place. This file's job is narrower: reject
empty/oversized content and strip control characters that have no
business in a chat message, and find @mentions in text that's already
known to be plain.

Rate limiting is deliberately simple and DB-backed (a count query against
rows the service layer already has to query anyway) rather than an
in-memory token bucket — consistent with this project never keeping
request-relevant state outside the database, and it means the limit holds
even across a backend restart.
"""
import re

MAX_MESSAGE_LENGTH = 4000
MAX_DISCUSSION_TITLE_LENGTH = 200
MAX_DISCUSSION_DESCRIPTION_LENGTH = 6000
MAX_REPLY_LENGTH = 4000

# A sliding window: at most this many messages/replies from one user in
# this many seconds. Generous enough that a real conversation never hits
# it, tight enough to stop a scripted flood.
RATE_LIMIT_MAX_ACTIONS = 20
RATE_LIMIT_WINDOW_SECONDS = 60

_MENTION_RE = re.compile(r"(?<!\w)@([A-Za-z0-9_]{1,64})")
# Control characters other than newline/tab have no legitimate place in a
# chat message and are stripped rather than stored verbatim.
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_plain_text(raw: str) -> str:
    """Strips control characters and surrounding whitespace. Does NOT
    escape HTML — there's nothing to escape against, because this content
    is never rendered as HTML, only ever as plain text."""
    return _CONTROL_CHARS_RE.sub("", raw).strip()


def validate_content(raw: str | None, *, max_length: int, field_name: str = "content") -> str:
    if raw is None:
        raise ValueError(f"{field_name.capitalize()} is required.")
    cleaned = clean_plain_text(raw)
    if not cleaned:
        raise ValueError(f"{field_name.capitalize()} can't be empty.")
    if len(cleaned) > max_length:
        raise ValueError(f"{field_name.capitalize()} is too long (max {max_length} characters).")
    return cleaned


def extract_mentions(content: str) -> list[str]:
    """Returns the de-duplicated, ordered list of usernames mentioned via
    @username in the given (already-cleaned) text. Case preserved as
    typed; callers look usernames up case-sensitively since that's how
    they're stored (see User.username)."""
    seen: set[str] = set()
    mentions: list[str] = []
    for match in _MENTION_RE.finditer(content):
        username = match.group(1)
        if username not in seen:
            seen.add(username)
            mentions.append(username)
    return mentions


class RateLimitExceeded(Exception):
    """Raised by chat_service/community_service when a user exceeds
    RATE_LIMIT_MAX_ACTIONS within RATE_LIMIT_WINDOW_SECONDS. The API layer
    catches this specifically and maps it to HTTP 429 — a distinct
    exception type rather than overloading ValueError, so "bad input" and
    "you're sending too fast" are never confused with each other."""
