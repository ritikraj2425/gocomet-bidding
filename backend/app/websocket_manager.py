import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections grouped by RFQ room."""

    def __init__(self) -> None:
        # rfq_id -> set of WebSocket connections
        self.rooms: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, rfq_id: str) -> None:
        await websocket.accept()
        if rfq_id not in self.rooms:
            self.rooms[rfq_id] = set()
        self.rooms[rfq_id].add(websocket)

    def disconnect(self, websocket: WebSocket, rfq_id: str) -> None:
        if rfq_id in self.rooms:
            self.rooms[rfq_id].discard(websocket)
            if not self.rooms[rfq_id]:
                del self.rooms[rfq_id]

    async def broadcast_to_room(self, rfq_id: str, event: str, data: Any) -> None:
        message = json.dumps({"event": event, "data": data}, default=str)
        if rfq_id in self.rooms:
            dead = []
            for ws in self.rooms[rfq_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.rooms[rfq_id].discard(ws)


manager = ConnectionManager()

