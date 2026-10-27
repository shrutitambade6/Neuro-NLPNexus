"""
The one WebSocket endpoint for the whole app: a pure push/presence
channel layered on top of the ordinary REST endpoints in chat.py and
community.py, which perform every actual write (see connection_manager.py
and those routers' own docstrings for why). A browser's native WebSocket
API can't set a custom Authorization header, so the JWT travels as a
query parameter instead (`/api/ws?token=...`) and is verified with the
exact same get_current_user path every REST request already uses — not a
second, weaker auth mechanism.

The only inbound client->server events this socket accepts are ephemeral
and never touch the database: typing indicators and a keepalive ping.
Everything that needs to be persisted (sending a message, posting a
reply, accepting an answer...) goes through REST, where it can be
validated, rate-limited, and tested the same way as every other write in
this project.
"""
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm_models import Conversation
from app.services.auth_service import get_current_user
from app.services.connection_manager import connection_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...), db: Session = Depends(get_db)) -> None:
    user = get_current_user(db, token)
    if not user:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    connection_manager.register(user.id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "typing":
                conversation_id = data.get("conversation_id")
                if conversation_id is None:
                    continue
                convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if not convo or user.id not in (convo.user_a_id, convo.user_b_id):
                    continue
                other_id = convo.user_b_id if convo.user_a_id == user.id else convo.user_a_id
                await connection_manager.send_to_user(
                    other_id,
                    {
                        "type": "chat.typing",
                        "conversation_id": conversation_id,
                        "user_id": user.id,
                        "is_typing": bool(data.get("is_typing")),
                    },
                )
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.unregister(user.id, websocket)
