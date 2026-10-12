
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prototype only: username -> connected WebSocket clients
connections: dict[str, set[WebSocket]] = {}


async def deliver(username: str, payload: dict) -> None:
    """Deliver a message to every active connection for one username."""
    clients = list(connections.get(username, set()))

    for client in clients:
        try:
            await client.send_json(payload)
        except Exception:
            # Remove stale connections.
            connections.get(username, set()).discard(client)


@app.get("/")
async def home():
    return {"message": "Private chat server is running"}


@app.websocket("/ws")
async def private_chat(websocket: WebSocket):
    username = websocket.query_params.get("username", "").strip()

    if not username or len(username) > 30:
        await websocket.close(code=1008, reason="Invalid username")
        return

    # Case-insensitive usernames in this prototype.
    username = username.lower()

    await websocket.accept()
    connections.setdefault(username, set()).add(websocket)

    try:
        while True:
            data = await websocket.receive_json()

            if not isinstance(data, dict):
                continue

            recipient = data.get("recipient")
            text = data.get("text")

            if not isinstance(recipient, str) or not isinstance(text, str):
                continue

            recipient = recipient.strip().lower()
            text = text.strip()

            if (
                not recipient
                or len(recipient) > 30
                or not text
                or len(text) > 2000
                or recipient == username
            ):
                continue

            payload = {
                "sender": username,
                "recipient": recipient,
                "text": text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Deliver to the intended recipient.
            await deliver(recipient, payload)

            # Echo to the sender so their own UI displays the message.
            await deliver(username, payload)

    except WebSocketDisconnect:
        pass
    finally:
        # Remove only this socket; other tabs may remain connected.
        user_connections = connections.get(username)
        if user_connections:
            user_connections.discard(websocket)
            if not user_connections:
                connections.pop(username, None)
