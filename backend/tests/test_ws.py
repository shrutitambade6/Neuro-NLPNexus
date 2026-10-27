from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _register_and_token(email: str) -> str:
    r = client.post(
        "/api/auth/register",
        json={"username": email.split("@")[0], "full_name": "Test User", "college_email": f"{email.split('@')[0]}@vit.edu.in", "password": "hunter22pass", "confirm_password": "hunter22pass"},
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_ws_rejects_invalid_token():
    import pytest
    from starlette.websockets import WebSocketDisconnect

    # The server closes the socket (code 4401) right after a failed auth
    # check, before ever calling accept() — the test client surfaces that
    # as a WebSocketDisconnect out of the `with` statement itself, not out
    # of a subsequent receive().
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/ws?token=not-a-real-token"):
            pass
    assert exc_info.value.code == 4401


def test_ws_connects_and_relays_typing_indicator_between_participants():
    token_a = _register_and_token("alice_ws@example.com")
    token_b = _register_and_token("bob_ws@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]
    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]

    with client.websocket_connect(f"/api/ws?token={token_a}") as ws_a:
        with client.websocket_connect(f"/api/ws?token={token_b}") as ws_b:
            ws_a.send_json({"type": "typing", "conversation_id": convo_id, "is_typing": True})
            event = ws_b.receive_json()
            assert event["type"] == "chat.typing"
            assert event["conversation_id"] == convo_id
            assert event["is_typing"] is True


def test_ws_pushes_live_message_to_recipient():
    token_a = _register_and_token("alice_wsmsg@example.com")
    token_b = _register_and_token("bob_wsmsg@example.com")
    b_id = client.get("/api/auth/me", headers=_auth(token_b)).json()["id"]
    convo_id = client.post("/api/chat/conversations", json={"other_user_id": b_id}, headers=_auth(token_a)).json()[
        "conversation_id"
    ]

    with client.websocket_connect(f"/api/ws?token={token_b}") as ws_b:
        sent = client.post(
            f"/api/chat/conversations/{convo_id}/messages", json={"content": "live push test"}, headers=_auth(token_a)
        )
        assert sent.status_code == 201
        event = ws_b.receive_json()
        assert event["type"] == "chat.message"
        assert event["message"]["content"] == "live push test"
