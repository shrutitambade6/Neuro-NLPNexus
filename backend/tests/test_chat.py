from fastapi.testclient import TestClient

from app.main import app
from app.models.orm_models import Block
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


def _block(blocker_email: str, blocked_email: str) -> None:
    db = TestSessionLocal()
    try:
        from app.models.orm_models import User

        blocker = db.query(User).filter(User.username == (blocker_email).split("@")[0]).first()
        blocked = db.query(User).filter(User.username == (blocked_email).split("@")[0]).first()
        db.add(Block(blocker_id=blocker.id, blocked_id=blocked.id))
        db.commit()
    finally:
        db.close()


def test_chat_endpoints_reject_anonymous_requests():
    assert client.get("/api/chat/conversations").status_code == 401
    assert client.get("/api/chat/users/search?q=a").status_code == 401
    assert client.post("/api/chat/conversations", json={"other_user_id": 1}).status_code == 401


def test_search_users_excludes_self_and_finds_by_username():
    token_a = _register_and_token("alice_chat@example.com")
    _register_and_token("bob_chat@example.com")

    r = client.get("/api/chat/users/search?q=bob_chat", headers=_auth(token_a))
    assert r.status_code == 200
    usernames = [u["username"] for u in r.json()["users"]]
    assert "bob_chat" in usernames
    assert "alice_chat" not in usernames  # never finds yourself


def test_start_conversation_is_idempotent_for_the_same_pair():
    token_a = _register_and_token("alice_convo@example.com")
    token_b = _register_and_token("bob_convo@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]

    r1 = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a))
    r2 = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a))
    assert r1.status_code == 201 and r2.status_code == 201
    assert r1.json()["conversation_id"] == r2.json()["conversation_id"]

    # Starting it from B's side (reversed order) must land on the SAME
    # conversation, not create a second row for the same pair.
    a_id = client.get("/api/auth/me", headers=_auth(token_a)).json()["id"]
    r3 = client.post("/api/chat/conversations", json={"other_user_id": a_id}, headers=_auth(token_b))
    assert r3.json()["conversation_id"] == r1.json()["conversation_id"]


def test_send_receive_and_read_receipt_flow():
    token_a = _register_and_token("alice_msg@example.com")
    token_b = _register_and_token("bob_msg@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]

    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]

    send = client.post(
        f"/api/chat/conversations/{convo_id}/messages", json={"content": "hello there"}, headers=_auth(token_a)
    )
    assert send.status_code == 201
    assert send.json()["content"] == "hello there"
    assert send.json()["read_at"] is None

    # B sees it unread in their conversation list.
    b_list = client.get("/api/chat/conversations", headers=_auth(token_b)).json()["conversations"]
    assert b_list[0]["unread_count"] == 1
    assert b_list[0]["last_message_preview"] == "hello there"

    # B reads it.
    marked = client.post(f"/api/chat/conversations/{convo_id}/read", headers=_auth(token_b))
    assert marked.json()["marked_read"] == 1

    b_list_after = client.get("/api/chat/conversations", headers=_auth(token_b)).json()["conversations"]
    assert b_list_after[0]["unread_count"] == 0

    messages = client.get(f"/api/chat/conversations/{convo_id}/messages", headers=_auth(token_a)).json()["messages"]
    assert messages[0]["read_at"] is not None


def test_cannot_access_a_conversation_youre_not_part_of():
    token_a = _register_and_token("alice_priv@example.com")
    token_b = _register_and_token("bob_priv@example.com")
    token_c = _register_and_token("carol_priv@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]

    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]

    r = client.get(f"/api/chat/conversations/{convo_id}/messages", headers=_auth(token_c))
    assert r.status_code == 403

    r2 = client.post(f"/api/chat/conversations/{convo_id}/messages", json={"content": "sneaky"}, headers=_auth(token_c))
    assert r2.status_code == 403


def test_edit_and_delete_own_message_but_not_others():
    token_a = _register_and_token("alice_edit@example.com")
    token_b = _register_and_token("bob_edit@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]
    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]
    msg = client.post(
        f"/api/chat/conversations/{convo_id}/messages", json={"content": "oops typo"}, headers=_auth(token_a)
    ).json()

    # B can't edit or delete A's message.
    assert client.patch(f"/api/chat/messages/{msg['id']}", json={"content": "hacked"}, headers=_auth(token_b)).status_code == 403
    assert client.delete(f"/api/chat/messages/{msg['id']}", headers=_auth(token_b)).status_code == 403

    edited = client.patch(f"/api/chat/messages/{msg['id']}", json={"content": "fixed typo"}, headers=_auth(token_a))
    assert edited.status_code == 200
    assert edited.json()["content"] == "fixed typo"
    assert edited.json()["edited_at"] is not None

    deleted = client.delete(f"/api/chat/messages/{msg['id']}", headers=_auth(token_a))
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True
    assert deleted.json()["content"] == "This message was deleted."


def test_blocked_user_cannot_send_messages():
    token_a = _register_and_token("alice_block@example.com")
    token_b = _register_and_token("bob_block@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]
    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]

    _block(blocker_email="bob_block@example.com", blocked_email="alice_block@example.com")

    r = client.post(f"/api/chat/conversations/{convo_id}/messages", json={"content": "hi?"}, headers=_auth(token_a))
    assert r.status_code == 403


def test_message_rate_limit_returns_429():
    token_a = _register_and_token("alice_rate@example.com")
    token_b = _register_and_token("bob_rate@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]
    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]

    statuses = []
    for i in range(25):
        r = client.post(
            f"/api/chat/conversations/{convo_id}/messages", json={"content": f"msg {i}"}, headers=_auth(token_a)
        )
        statuses.append(r.status_code)
    assert 429 in statuses
    assert statuses[:20] == [201] * 20


def test_block_and_unblock_user():
    token_a = _register_and_token("alice_blocktest@example.com")
    token_b = _register_and_token("bob_blocktest@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]
    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]

    blocked = client.post("/api/chat/block", json={"user_id": b_id}, headers=_auth(token_a))
    assert blocked.status_code == 201

    blocked_list = client.get("/api/chat/blocked", headers=_auth(token_a)).json()
    assert any(u["id"] == b_id for u in blocked_list)

    forbidden = client.post(
        f"/api/chat/conversations/{convo_id}/messages", json={"content": "hi"}, headers=_auth(token_b)
    )
    assert forbidden.status_code == 403

    client.delete(f"/api/chat/block/{b_id}", headers=_auth(token_a))
    allowed = client.post(
        f"/api/chat/conversations/{convo_id}/messages", json={"content": "hi again"}, headers=_auth(token_b)
    )
    assert allowed.status_code == 201


def test_new_message_creates_a_notification_even_when_recipient_is_online():
    # Regression test: sending a message used to only create a persisted
    # Notification row when the recipient's socket was NOT connected
    # (chat_service.send_message gated it on `not connection_manager.is_online`).
    # That conflated "has a WebSocket open somewhere in the app" with
    # "is looking at this conversation" -- an online-but-elsewhere recipient
    # (e.g. sitting on /notifications or /dashboard) got no bell entry at
    # all for a new DM. This test never touches connection_manager, so the
    # recipient here has no live connection either way -- the point is that
    # the Notification row and the bell's unread_count must reflect the
    # message regardless, and must clear once the recipient reads it.
    token_a = _register_and_token("carol_chat@example.com")
    token_b = _register_and_token("dave_chat@example.com")
    b_id = client.get("/api/chat/users/search?q=dave_chat", headers=_auth(token_a)).json()["users"][0]["id"]

    convo_id = client.post(
        "/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)
    ).json()["conversation_id"]
    r = client.post(
        f"/api/chat/conversations/{convo_id}/messages", json={"content": "are you there?"}, headers=_auth(token_a)
    )
    assert r.status_code == 201, r.text

    notifs = client.get("/api/community/notifications", headers=_auth(token_b)).json()
    assert notifs["unread_count"] >= 1
    message_notifs = [n for n in notifs["notifications"] if n["notif_type"] == "message"]
    assert len(message_notifs) == 1
    assert message_notifs[0]["reference_id"] == convo_id
    assert message_notifs[0]["is_read"] is False

    # Reading the conversation clears it, same as before this fix.
    client.post(f"/api/chat/conversations/{convo_id}/read", headers=_auth(token_b))
    notifs_after = client.get("/api/community/notifications", headers=_auth(token_b)).json()
    message_notifs_after = [n for n in notifs_after["notifications"] if n["notif_type"] == "message" and n["reference_id"] == convo_id]
    assert all(n["is_read"] for n in message_notifs_after)
