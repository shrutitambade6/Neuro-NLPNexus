"""
In-process WebSocket connection registry for the Community/Chat feature.

This is real presence tracking, not a stored-but-fake "online" flag: a
user is "online" exactly when they have at least one open WebSocket
connection registered here (a student can have more than one — e.g. two
browser tabs — so this maps a user_id to a SET of connections, not one).
There is deliberately no persisted "is_online" column on User — presence
that outlives the process it's tracked in would just go stale the moment
the backend restarts without a client noticing, which is the exact kind
of not-quite-real data this project avoids.

Single process only: this assumes one backend process (matches this
project's SQLite-backed, single-uvicorn-worker deployment throughout). A
multi-process deployment would need a shared broker (e.g. Redis pub/sub)
instead of a module-level dict — explicitly out of scope here, same way
Alembic-based migrations are out of scope for this project's SQLite setup.
"""
from __future__ import annotations

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}

    def register(self, user_id: int, websocket: WebSocket) -> None:
        self._connections.setdefault(user_id, set()).add(websocket)

    def unregister(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)

    def is_online(self, user_id: int) -> bool:
        return bool(self._connections.get(user_id))

    def online_user_ids(self) -> set[int]:
        return {uid for uid, sockets in self._connections.items() if sockets}

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        """Best-effort push to every open connection for this user. A dead
        socket that fails to send is dropped from the registry rather than
        raising — the REST call that triggered this push has already
        succeeded and persisted the real data; a missed live push just
        means the recipient sees it on their next poll/reload instead of
        instantly, which is not a reason to fail the request."""
        sockets = list(self._connections.get(user_id, ()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:  # noqa: BLE001 — a send failure means a dead socket, not a bug
                dead.append(ws)
        for ws in dead:
            self.unregister(user_id, ws)

    async def send_to_users(self, user_ids: list[int], payload: dict) -> None:
        for uid in user_ids:
            await self.send_to_user(uid, payload)


# One shared instance for the whole process — every service/API module
# that needs to push a live event or check presence imports this same
# object, so there is exactly one registry, never two that could disagree.
connection_manager = ConnectionManager()
