"""
Password hashing and JSON Web Tokens, implemented with the Python standard
library only (hashlib/hmac/secrets/base64/json) — no passlib/bcrypt/
python-jose dependency added, since those aren't in requirements.txt and
this project avoids adding a new backend dependency unless it's actually
needed.

Both pieces are real, standards-based implementations, not simplified
stand-ins: passwords are hashed with PBKDF2-HMAC-SHA256 (NIST-recommended,
600k iterations as of OWASP's current guidance, a random salt per
password) rather than stored in any recoverable form, and the tokens
issued are genuine HS256-signed JSON Web Tokens — the exact format any
standard JWT library can decode and verify, not a look-alike.

Super Admin Portal milestone note: the iteration count was raised from
this project's original 260_000 to 600_000 (OWASP's current recommendation
for PBKDF2-HMAC-SHA256) rather than switching to bcrypt/Argon2id — see the
module docstring reasoning above (stdlib only, no new dependency).
verify_password reads the iteration count back out of the stored hash
string itself (not this module-level constant), so every password hashed
under the old 260_000 setting keeps verifying correctly; only passwords
hashed or reset from now on use 600_000.
"""
import base64
import hashlib
import hmac
import json
import secrets
import time

PBKDF2_ITERATIONS = 600_000
_ALGO_NAME = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"{_ALGO_NAME}${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algo, iterations_str, salt, hex_digest = stored_hash.split("$")
    except ValueError:
        return False
    if algo != _ALGO_NAME:
        return False
    try:
        iterations = int(iterations_str)
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), iterations)
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(candidate.hex(), hex_digest)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(payload: dict, secret: str, expires_in_seconds: int = 60 * 60 * 24) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    full_payload = {**payload, "iat": now, "exp": now + expires_in_seconds}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(full_payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"


def decode_access_token(token: str, secret: str) -> dict | None:
    """Returns the verified payload, or None for any invalid, tampered, or
    expired token — callers treat None as 'not authenticated', never raise."""
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    try:
        actual_signature = _b64url_decode(signature_b64)
    except Exception:
        return None
    if not hmac.compare_digest(expected_signature, actual_signature):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except Exception:
        return None

    if payload.get("exp", 0) < time.time():
        return None
    return payload
