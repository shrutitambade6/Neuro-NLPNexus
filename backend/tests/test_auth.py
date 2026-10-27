from app.algorithms.auth import create_access_token, decode_access_token, hash_password, verify_password


def test_hash_password_produces_different_hash_each_time():
    # Random salt per call — same password, different stored hash.
    h1 = hash_password("correct horse battery staple")
    h2 = hash_password("correct horse battery staple")
    assert h1 != h2


def test_verify_password_accepts_correct_password():
    stored = hash_password("my-secret-password")
    assert verify_password("my-secret-password", stored) is True


def test_verify_password_rejects_wrong_password():
    stored = hash_password("my-secret-password")
    assert verify_password("wrong-password", stored) is False


def test_verify_password_rejects_malformed_stored_hash():
    assert verify_password("anything", "not-a-real-hash") is False


def test_jwt_roundtrip():
    token = create_access_token({"sub": "42", "email": "a@b.com"}, "test-secret")
    payload = decode_access_token(token, "test-secret")
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["email"] == "a@b.com"


def test_jwt_rejects_wrong_secret():
    token = create_access_token({"sub": "42"}, "secret-a")
    assert decode_access_token(token, "secret-b") is None


def test_jwt_rejects_tampered_payload():
    token = create_access_token({"sub": "42"}, "test-secret")
    header_b64, payload_b64, sig_b64 = token.split(".")
    tampered = f"{header_b64}.{payload_b64}x.{sig_b64}"
    assert decode_access_token(tampered, "test-secret") is None


def test_jwt_rejects_expired_token():
    token = create_access_token({"sub": "42"}, "test-secret", expires_in_seconds=-1)
    assert decode_access_token(token, "test-secret") is None


def test_jwt_rejects_malformed_token():
    assert decode_access_token("not.a.jwt.at.all", "test-secret") is None
    assert decode_access_token("garbage", "test-secret") is None
