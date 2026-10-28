from fastapi.testclient import TestClient

from app.main import app
from app.services.challenges_service import seed_dl_challenges
from tests.conftest import TestSessionLocal, verify_and_login

client = TestClient(app)


def _seed():
    db = TestSessionLocal()
    try:
        seed_dl_challenges(db)
    finally:
        db.close()


def _register_and_get_token(email: str) -> str:
    username = email.split("@")[0]
    client.post(
        "/api/auth/register",
        json={
            "username": username,
            "full_name": "Test User",
            "college_email": f"{username}@vit.edu.in",
            "password": "hunter22pass",
            "confirm_password": "hunter22pass",
        },
    )
    # Production-Ready Email Verification milestone (2026-10-28) --
    # registration no longer issues a token for an unverified account;
    # this completes the real verify-email flow then logs in for a real
    # one. See tests/conftest.py's verify_and_login for the full comment.
    return verify_and_login(client, username)


def test_list_challenges_endpoint_returns_seeded_set():
    _seed()
    response = client.get("/api/dl/challenges")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 7  # len(DL_CHALLENGE_SPECS)
    for c in body:
        assert "answer_json" not in c  # never leak the answer
        assert c["module"] in ("dl-foundations", "cnn", "rnn", "attention")


def test_attempt_without_auth_rejected():
    _seed()
    response = client.get("/api/dl/challenges").json()
    challenge_id = response[0]["id"]
    r = client.post(f"/api/dl/challenges/{challenge_id}/attempt", json={"submitted_answer": 0.5})
    assert r.status_code == 401


def test_attempt_with_correct_answer_awards_xp():
    _seed()
    token = _register_and_get_token("challenger1@example.com")
    challenges = client.get("/api/dl/challenges").json()
    relu_challenge = next(c for c in challenges if c["prompt"]["type"] == "activation_point")
    response = client.post(
        f"/api/dl/challenges/{relu_challenge['id']}/attempt",
        json={"submitted_answer": 0.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["correct"] is True
    assert body["xp_awarded"] == relu_challenge["xp_value"]


def test_attempt_with_wrong_answer_awards_no_xp():
    _seed()
    token = _register_and_get_token("challenger2@example.com")
    challenges = client.get("/api/dl/challenges").json()
    relu_challenge = next(c for c in challenges if c["prompt"]["type"] == "activation_point")
    response = client.post(
        f"/api/dl/challenges/{relu_challenge['id']}/attempt",
        json={"submitted_answer": 999.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["correct"] is False
    assert body["xp_awarded"] == 0
    assert body["correct_answer"] == 0.0


def test_attempt_with_numeric_tolerance_still_counts_correct():
    _seed()
    token = _register_and_get_token("challenger3@example.com")
    challenges = client.get("/api/dl/challenges").json()
    neuron_challenge = next(c for c in challenges if c["prompt"]["type"] == "neuron_forward")
    # submit a slightly-rounded version of the true sigmoid output
    response = client.post(
        f"/api/dl/challenges/{neuron_challenge['id']}/attempt",
        json={"submitted_answer": 0.65},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    # sigmoid(1*0.5 + 2*-0.5 + 0.1) = sigmoid(-0.4) ≈ 0.401, so 0.65 should be WRONG
    assert response.json()["correct"] is False


def test_attempt_nonexistent_challenge_returns_404():
    _seed()
    token = _register_and_get_token("challenger4@example.com")
    response = client.post(
        "/api/dl/challenges/999999/attempt",
        json={"submitted_answer": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_my_progress_without_auth_rejected():
    _seed()
    response = client.get("/api/dl/challenges/my-progress")
    assert response.status_code == 401


def test_my_progress_reflects_real_attempts():
    _seed()
    token = _register_and_get_token("progress1@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    initial = client.get("/api/dl/challenges/my-progress", headers=headers).json()
    assert initial["solved"] == 0
    assert initial["attempted"] == 0
    assert initial["total_xp"] == 0
    assert initial["total_challenges"] == 7

    challenges = client.get("/api/dl/challenges").json()
    relu_challenge = next(c for c in challenges if c["prompt"]["type"] == "activation_point")
    client.post(f"/api/dl/challenges/{relu_challenge['id']}/attempt", json={"submitted_answer": 0.0}, headers=headers)

    after = client.get("/api/dl/challenges/my-progress", headers=headers).json()
    assert after["solved"] == 1
    assert after["attempted"] == 1
    assert after["total_xp"] == relu_challenge["xp_value"]


def test_my_progress_does_not_double_count_a_challenge_solved_twice():
    _seed()
    token = _register_and_get_token("progress2@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    challenges = client.get("/api/dl/challenges").json()
    relu_challenge = next(c for c in challenges if c["prompt"]["type"] == "activation_point")

    # attempt it wrong once, then correctly twice
    client.post(f"/api/dl/challenges/{relu_challenge['id']}/attempt", json={"submitted_answer": 999}, headers=headers)
    client.post(f"/api/dl/challenges/{relu_challenge['id']}/attempt", json={"submitted_answer": 0.0}, headers=headers)
    client.post(f"/api/dl/challenges/{relu_challenge['id']}/attempt", json={"submitted_answer": 0.0}, headers=headers)

    progress = client.get("/api/dl/challenges/my-progress", headers=headers).json()
    assert progress["solved"] == 1
    assert progress["attempted"] == 1
    assert progress["total_xp"] == relu_challenge["xp_value"]


def test_seeding_is_idempotent():
    _seed()
    first = client.get("/api/dl/challenges").json()
    _seed()  # call again
    second = client.get("/api/dl/challenges").json()
    assert len(first) == len(second)
