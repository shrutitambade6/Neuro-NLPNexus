"""
One test that walks through the exact end-to-end demo script from the
Community/Chat spec, verifying each step against the real backend:

Student A logs in -> opens Community -> selects NLP -> creates a "POS
Tagging doubt" -> Student B's reply shows up live for them to find in the
NLP discussion list -> Student B opens the discussion and replies ->
Student A receives the reply in real time (WebSocket push) -> Teacher logs
in -> sees the unanswered/active NLP discussion -> Teacher replies with an
explanation -> Student A receives the teacher response in real time ->
Student A marks the helpful answer -> the discussion becomes "Answered"
and is recorded in the activity system.
"""
from fastapi.testclient import TestClient

from app.main import app
from app.models.orm_models import ActivityLog, User
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


def _promote_to_admin(email: str) -> None:
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.username == (email).split("@")[0]).first()
        user.role = "admin"
        db.commit()
    finally:
        db.close()


def test_full_demo_script_end_to_end():
    # Student A logs in (registers, same thing here) and opens Community -> NLP.
    token_a = _register_and_token("demo_student_a@example.com")
    nlp_topics = client.get("/api/community/topics", headers=_auth(token_a)).json()["nlp"]
    assert any(t["name"] == "POS Tagging" for t in nlp_topics)

    # Student A creates a "POS Tagging doubt".
    created = client.post(
        "/api/community/discussions",
        json={
            "title": "POS Tagging doubt",
            "description": "I don't understand how the tagger decides NN vs VB here.",
            "domain": "nlp",
            "topic": "POS Tagging",
            "linked_module_id": "pos-tagging",
        },
        headers=_auth(token_a),
    )
    assert created.status_code == 201
    discussion_id = created.json()["id"]
    assert created.json()["status"] == "open"

    # Student B logs in, browses NLP, and finds the new unanswered discussion.
    token_b = _register_and_token("demo_student_b@example.com")
    nlp_list = client.get("/api/community/discussions?domain=nlp&status=open", headers=_auth(token_b)).json()[
        "discussions"
    ]
    assert any(d["id"] == discussion_id for d in nlp_list)

    # Student B opens the discussion and replies. Student A is listening
    # live over the WebSocket and gets the reply pushed instantly.
    with client.websocket_connect(f"/api/ws?token={token_a}") as ws_a:
        reply_b = client.post(
            f"/api/community/discussions/{discussion_id}/replies",
            json={"content": "Nouns usually follow a determiner; the tagger uses that context window."},
            headers=_auth(token_b),
        )
        assert reply_b.status_code == 201
        push = ws_a.receive_json()
        assert push["type"] == "discussion.reply"
        assert push["discussion_id"] == discussion_id

    # Teacher logs in and sees the still-unanswered NLP discussion.
    teacher_token = _register_and_token("demo_teacher@example.com")
    _promote_to_admin("demo_teacher@example.com")
    teacher_view = client.get("/api/community/discussions?domain=nlp&status=open", headers=_auth(teacher_token)).json()[
        "discussions"
    ]
    assert any(d["id"] == discussion_id for d in teacher_view)

    # Teacher replies with a fuller explanation. Student A receives it live too.
    with client.websocket_connect(f"/api/ws?token={token_a}") as ws_a:
        teacher_reply = client.post(
            f"/api/community/discussions/{discussion_id}/replies",
            json={"content": "Formally: the tagger's HMM picks NN vs VB from the preceding tag's transition probabilities."},
            headers=_auth(teacher_token),
        )
        assert teacher_reply.status_code == 201
        assert teacher_reply.json()["author_is_teacher"] is True
        push = ws_a.receive_json()
        assert push["type"] == "discussion.reply"
        assert push["reply"]["author_is_teacher"] is True
    teacher_reply_id = teacher_reply.json()["id"]

    detail_for_a = client.get(f"/api/community/discussions/{discussion_id}", headers=_auth(token_a)).json()
    assert detail_for_a["has_teacher_reply"] is True
    assert detail_for_a["reply_count"] == 2

    # Student A marks the teacher's answer as the accepted/helpful one.
    accepted = client.post(
        f"/api/community/discussions/{discussion_id}/accept",
        json={"reply_id": teacher_reply_id},
        headers=_auth(token_a),
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "answered"
    assert accepted.json()["accepted_reply_id"] == teacher_reply_id

    # The discussion now shows as Answered to everyone browsing NLP.
    final_list = client.get("/api/community/discussions?domain=nlp&status=answered", headers=_auth(token_b)).json()[
        "discussions"
    ]
    assert any(d["id"] == discussion_id for d in final_list)

    # And it's recorded in the real activity system, not just flipped in place.
    db = TestSessionLocal()
    try:
        a = db.query(User).filter(User.username == ("demo_student_a@example.com").split("@")[0]).first()
        teacher = db.query(User).filter(User.username == ("demo_teacher@example.com").split("@")[0]).first()
        assert (
            db.query(ActivityLog)
            .filter(ActivityLog.user_id == a.id, ActivityLog.activity_type == "discussion_answered")
            .count()
            == 1
        )
        assert (
            db.query(ActivityLog)
            .filter(ActivityLog.user_id == teacher.id, ActivityLog.activity_type == "discussion_answer_accepted")
            .count()
            == 1
        )
    finally:
        db.close()
