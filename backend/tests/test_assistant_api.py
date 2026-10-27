from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_assistant_endpoint_returns_structured_response(auth_headers):
    resp = client.post("/api/applications/assistant", json={"message": "What is tokenization?"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "DEFINITION"
    assert data["topic"] == "tokenization"
    assert isinstance(data["blocks"], list) and data["blocks"]
    assert data["context"]["currentTopic"] == "tokenization"


def test_assistant_endpoint_round_trips_context_for_followups(auth_headers):
    r1 = client.post("/api/applications/assistant", json={"message": "What is CYK parsing?"}, headers=auth_headers)
    ctx = r1.json()["context"]
    r2 = client.post("/api/applications/assistant", json={"message": "Give me an example.", "context": ctx}, headers=auth_headers)
    data = r2.json()
    assert data["topic"] == "cyk"


def test_assistant_endpoint_rejects_empty_message(auth_headers):
    resp = client.post("/api/applications/assistant", json={"message": ""}, headers=auth_headers)
    assert resp.status_code == 422


def test_assistant_endpoint_numerical_roundtrip(auth_headers):
    r1 = client.post("/api/applications/assistant", json={"message": "Give me a numerical on bigram probability."}, headers=auth_headers)
    ctx = r1.json()["context"]
    correct = ctx["pendingNumerical"]["correctAnswer"]
    r2 = client.post("/api/applications/assistant", json={"message": str(correct), "context": ctx}, headers=auth_headers)
    data = r2.json()
    assert data["intent"] == "NUMERICAL_ANSWER"


def test_assistant_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/applications/assistant")
    assert response.status_code == 401
