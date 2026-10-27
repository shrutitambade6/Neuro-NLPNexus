from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _register_and_token(email: str) -> str:
    r = client.post("/api/auth/register", json={"username": email.split("@")[0], "full_name": "Test User", "college_email": f"{email.split('@')[0]}@vit.edu.in", "password": "hunter22pass", "confirm_password": "hunter22pass"})
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_progress_endpoints_require_auth():
    assert client.post("/api/progress/complete", json={"domain": "dl", "module_id": "dl-module-1"}).status_code == 401
    assert client.post("/api/progress/quiz-result", json={"domain": "dl", "quiz_id": "x", "total_questions": 1, "correct_answers": 1}).status_code == 401
    assert client.get("/api/progress/my-summary").status_code == 401


def test_record_progress_rejects_unknown_module_id():
    token = _register_and_token("badmod@example.com")
    r = client.post(
        "/api/progress/complete",
        json={"domain": "dl", "module_id": "not-a-real-page"},
        headers=_auth(token),
    )
    assert r.status_code == 422


def test_record_progress_marks_lesson_complete_and_is_idempotent():
    token = _register_and_token("progress1@example.com")
    r1 = client.post("/api/progress/complete", json={"domain": "dl", "module_id": "dl-module-1"}, headers=_auth(token))
    assert r1.status_code == 200
    assert r1.json()["status"] == "completed"

    # Completing the same lesson again updates the same row, not a duplicate.
    r2 = client.post("/api/progress/complete", json={"domain": "dl", "module_id": "dl-module-1"}, headers=_auth(token))
    assert r2.status_code == 200

    summary = client.get("/api/progress/my-summary", headers=_auth(token)).json()
    assert summary["dl_progress"]["completed"] == 1
    assert summary["completed_tasks"] == 1


def test_record_quiz_result_computes_percentage_score():
    token = _register_and_token("quiz1@example.com")
    r = client.post(
        "/api/progress/quiz-result",
        json={"domain": "dl", "quiz_id": "dl-module-1-quiz", "total_questions": 5, "correct_answers": 4},
        headers=_auth(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["score"] == 80

    summary = client.get("/api/progress/my-summary", headers=_auth(token)).json()
    assert summary["quiz_attempts"] == 1
    assert summary["average_quiz_score"] == 80


def test_badge_awarded_and_logged_as_activity():
    token = _register_and_token("badge1@example.com")
    client.post(
        "/api/progress/quiz-result",
        json={"domain": "dl", "quiz_id": "perfect-quiz", "total_questions": 4, "correct_answers": 4},
        headers=_auth(token),
    )
    summary = client.get("/api/progress/my-summary", headers=_auth(token)).json()
    badge_keys = [b["key"] for b in summary["badges"]]
    assert "quiz_taker" in badge_keys
    assert "quiz_ace" in badge_keys

    activity_types = [a["activity_type"] for a in summary["recent_activity"]]
    assert "badge_earned" in activity_types
    assert "quiz_attempt" in activity_types


def test_progress_is_scoped_to_the_authenticated_user_only():
    token_a = _register_and_token("usera@example.com")
    token_b = _register_and_token("userb@example.com")

    client.post("/api/progress/complete", json={"domain": "nlp", "module_id": "parsing"}, headers=_auth(token_a))

    summary_a = client.get("/api/progress/my-summary", headers=_auth(token_a)).json()
    summary_b = client.get("/api/progress/my-summary", headers=_auth(token_b)).json()

    assert summary_a["nlp_progress"]["completed"] == 1
    assert summary_b["nlp_progress"]["completed"] == 0
