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


def _create_discussion(token: str, **overrides) -> dict:
    payload = {
        "title": "How does POS tagging identify nouns?",
        "description": "I don't understand how the tagger decides NN vs VB for ambiguous words.",
        "domain": "nlp",
        "topic": "POS Tagging",
        "linked_module_id": "pos-tagging",
    }
    payload.update(overrides)
    r = client.post("/api/community/discussions", json=payload, headers=_auth(token))
    assert r.status_code == 201, r.text
    return r.json()


def test_community_endpoints_reject_anonymous_requests():
    assert client.get("/api/community/discussions").status_code == 401
    assert client.post("/api/community/discussions", json={}).status_code == 401


def test_topics_endpoint_returns_fixed_catalog():
    r = client.get("/api/community/topics")
    assert r.status_code == 200
    body = r.json()
    nlp_names = {t["name"] for t in body["nlp"]}
    dl_names = {t["name"] for t in body["dl"]}
    assert "POS Tagging" in nlp_names and "Parsing" in nlp_names
    assert "CNN" in dl_names and "RNN/LSTM" in dl_names


def test_create_discussion_rejects_bad_domain_topic_or_module():
    token = _register_and_token("asker_bad@example.com")
    assert client.post(
        "/api/community/discussions",
        json={"title": "t", "description": "d", "domain": "biology", "topic": "x"},
        headers=_auth(token),
    ).status_code == 400
    assert client.post(
        "/api/community/discussions",
        json={"title": "t", "description": "d", "domain": "nlp", "topic": "Nope Not A Topic"},
        headers=_auth(token),
    ).status_code == 400
    # A DL module id attached to an "nlp" discussion is rejected, not silently accepted.
    assert client.post(
        "/api/community/discussions",
        json={"title": "t", "description": "d", "domain": "nlp", "topic": "Parsing", "linked_module_id": "cnn-lab"},
        headers=_auth(token),
    ).status_code == 400


def test_create_and_list_discussions_with_filters():
    asker_token = _register_and_token("asker_filter@example.com")
    _create_discussion(asker_token, title="POS doubt", domain="nlp", topic="POS Tagging")
    _create_discussion(asker_token, title="CNN doubt", domain="dl", topic="CNN", linked_module_id="cnn-lab")

    all_nlp = client.get("/api/community/discussions?domain=nlp", headers=_auth(asker_token)).json()["discussions"]
    assert all(d["domain"] == "nlp" for d in all_nlp)
    assert any(d["title"] == "POS doubt" for d in all_nlp)

    unanswered = client.get("/api/community/discussions?status=open", headers=_auth(asker_token)).json()["discussions"]
    assert all(d["status"] == "open" for d in unanswered)

    mine = client.get("/api/community/discussions?mine=true", headers=_auth(asker_token)).json()["discussions"]
    assert len(mine) == 2


def test_reply_notifies_discussion_author_and_appears_in_detail():
    asker_token = _register_and_token("asker_reply@example.com")
    replier_token = _register_and_token("replier_reply@example.com")
    discussion = _create_discussion(asker_token)

    reply = client.post(
        f"/api/community/discussions/{discussion['id']}/replies",
        json={"content": "Nouns usually follow determiners; the tagger uses context windows."},
        headers=_auth(replier_token),
    )
    assert reply.status_code == 201
    assert reply.json()["author_is_teacher"] is False

    detail = client.get(f"/api/community/discussions/{discussion['id']}", headers=_auth(asker_token)).json()
    assert detail["reply_count"] == 1
    assert detail["replies"][0]["content"].startswith("Nouns usually")

    notifs = client.get("/api/community/notifications", headers=_auth(asker_token)).json()
    assert notifs["unread_count"] >= 1
    assert any(n["notif_type"] == "reply" for n in notifs["notifications"])


def test_teacher_reply_is_flagged_and_sends_teacher_response_notification():
    asker_token = _register_and_token("asker_teacher@example.com")
    teacher_token = _register_and_token("teacher_reply@example.com")
    _promote_to_admin("teacher_reply@example.com")
    discussion = _create_discussion(asker_token)

    reply = client.post(
        f"/api/community/discussions/{discussion['id']}/replies",
        json={"content": "Here's the formal explanation with the CYK table."},
        headers=_auth(teacher_token),
    )
    assert reply.json()["author_is_teacher"] is True

    detail = client.get(f"/api/community/discussions/{discussion['id']}", headers=_auth(asker_token)).json()
    assert detail["has_teacher_reply"] is True

    notifs = client.get("/api/community/notifications", headers=_auth(asker_token)).json()["notifications"]
    assert any(n["notif_type"] == "teacher_response" for n in notifs)


def test_only_discussion_author_can_accept_an_answer():
    asker_token = _register_and_token("asker_accept@example.com")
    replier_token = _register_and_token("replier_accept@example.com")
    other_token = _register_and_token("rando_accept@example.com")
    discussion = _create_discussion(asker_token)
    reply = client.post(
        f"/api/community/discussions/{discussion['id']}/replies",
        json={"content": "This is the answer."},
        headers=_auth(replier_token),
    ).json()

    forbidden = client.post(
        f"/api/community/discussions/{discussion['id']}/accept", json={"reply_id": reply["id"]}, headers=_auth(other_token)
    )
    assert forbidden.status_code == 403

    accepted = client.post(
        f"/api/community/discussions/{discussion['id']}/accept", json={"reply_id": reply["id"]}, headers=_auth(asker_token)
    )
    assert accepted.status_code == 200
    body = accepted.json()
    assert body["status"] == "answered"
    assert body["accepted_reply_id"] == reply["id"]
    assert body["replies"][0]["is_accepted"] is True

    # Recorded in the real activity system, for both the asker and the answerer.
    db = TestSessionLocal()
    try:
        asker = db.query(User).filter(User.username == ("asker_accept@example.com").split("@")[0]).first()
        replier = db.query(User).filter(User.username == ("replier_accept@example.com").split("@")[0]).first()
        asker_log = db.query(ActivityLog).filter(ActivityLog.user_id == asker.id, ActivityLog.activity_type == "discussion_answered").all()
        replier_log = (
            db.query(ActivityLog)
            .filter(ActivityLog.user_id == replier.id, ActivityLog.activity_type == "discussion_answer_accepted")
            .all()
        )
        assert len(asker_log) == 1
        assert len(replier_log) == 1
    finally:
        db.close()

    # The accepted reply's author gets an accepted_answer notification.
    notifs = client.get("/api/community/notifications", headers=_auth(replier_token)).json()["notifications"]
    assert any(n["notif_type"] == "accepted_answer" for n in notifs)


def test_mention_in_reply_notifies_the_mentioned_user():
    asker_token = _register_and_token("asker_mention@example.com")
    mentioned_token = _register_and_token("mentioned_user@example.com")
    replier_token = _register_and_token("replier_mention@example.com")
    discussion = _create_discussion(asker_token)

    client.post(
        f"/api/community/discussions/{discussion['id']}/replies",
        json={"content": "@mentioned_user you should check this out too!"},
        headers=_auth(replier_token),
    )

    notifs = client.get("/api/community/notifications", headers=_auth(mentioned_token)).json()
    assert any(n["notif_type"] == "mention" for n in notifs["notifications"])


def test_save_toggle_and_saved_filter():
    asker_token = _register_and_token("asker_save@example.com")
    saver_token = _register_and_token("saver_save@example.com")
    discussion = _create_discussion(asker_token)

    toggle_on = client.post(f"/api/community/discussions/{discussion['id']}/save", headers=_auth(saver_token))
    assert toggle_on.json()["saved"] is True

    saved_list = client.get("/api/community/discussions?saved=true", headers=_auth(saver_token)).json()["discussions"]
    assert len(saved_list) == 1

    toggle_off = client.post(f"/api/community/discussions/{discussion['id']}/save", headers=_auth(saver_token))
    assert toggle_off.json()["saved"] is False

    saved_list_after = client.get("/api/community/discussions?saved=true", headers=_auth(saver_token)).json()["discussions"]
    assert len(saved_list_after) == 0


def test_notification_mark_read_and_mark_all_read():
    asker_token = _register_and_token("asker_notif@example.com")
    replier_token = _register_and_token("replier_notif@example.com")
    discussion = _create_discussion(asker_token)
    client.post(
        f"/api/community/discussions/{discussion['id']}/replies",
        json={"content": "answer one"},
        headers=_auth(replier_token),
    )

    notifs = client.get("/api/community/notifications", headers=_auth(asker_token)).json()
    assert notifs["unread_count"] == 1
    notif_id = notifs["notifications"][0]["id"]

    client.post(f"/api/community/notifications/{notif_id}/read", headers=_auth(asker_token))
    after_one = client.get("/api/community/notifications", headers=_auth(asker_token)).json()
    assert after_one["unread_count"] == 0

    client.post(
        f"/api/community/discussions/{discussion['id']}/replies",
        json={"content": "answer two"},
        headers=_auth(replier_token),
    )
    client.post("/api/community/notifications/read-all", headers=_auth(asker_token))
    after_all = client.get("/api/community/notifications", headers=_auth(asker_token)).json()
    assert after_all["unread_count"] == 0


def test_discussion_and_reply_rate_limit_returns_429():
    token = _register_and_token("spammer@example.com")
    statuses = []
    for i in range(25):
        r = client.post(
            "/api/community/discussions",
            json={
                "title": f"doubt {i}",
                "description": "filler description text",
                "domain": "nlp",
                "topic": "General NLP",
            },
            headers=_auth(token),
        )
        statuses.append(r.status_code)
    assert 429 in statuses
    assert statuses[:20] == [201] * 20


def test_toggle_helpful_reaction_on_reply():
    asker_token = _register_and_token("asker_react@example.com")
    replier_token = _register_and_token("replier_react@example.com")
    liker_token = _register_and_token("liker_react@example.com")
    discussion = _create_discussion(asker_token)
    reply = client.post(
        f"/api/community/discussions/{discussion['id']}/replies",
        json={"content": "Here's the explanation."},
        headers=_auth(replier_token),
    ).json()
    assert reply["helpful_count"] == 0
    assert reply["reacted_by_me"] is False

    on = client.post(f"/api/community/replies/{reply['id']}/reactions", headers=_auth(liker_token))
    assert on.status_code == 200
    assert on.json() == {"reacted": True, "helpful_count": 1}

    detail = client.get(f"/api/community/discussions/{discussion['id']}", headers=_auth(liker_token)).json()
    assert detail["replies"][0]["helpful_count"] == 1
    assert detail["replies"][0]["reacted_by_me"] is True

    detail_other = client.get(f"/api/community/discussions/{discussion['id']}", headers=_auth(asker_token)).json()
    assert detail_other["replies"][0]["reacted_by_me"] is False

    off = client.post(f"/api/community/replies/{reply['id']}/reactions", headers=_auth(liker_token))
    assert off.json() == {"reacted": False, "helpful_count": 0}


def test_report_content():
    reporter_token = _register_and_token("reporter_report@example.com")
    asker_token = _register_and_token("asker_report@example.com")
    discussion = _create_discussion(asker_token)

    r = client.post(
        "/api/community/reports",
        json={"target_type": "discussion", "target_id": discussion["id"], "reason": "This looks off-topic."},
        headers=_auth(reporter_token),
    )
    assert r.status_code == 201
    assert r.json()["status"] == "open"

    bad = client.post(
        "/api/community/reports",
        json={"target_type": "spaceship", "target_id": 1, "reason": "nope"},
        headers=_auth(reporter_token),
    )
    assert bad.status_code == 400
