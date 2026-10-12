from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keeps track of currently connected clients
active_connections: list[WebSocket] = []


@app.get("/")
async def home():
    return {"message": "Chat server is running"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            message = await websocket.receive_json()

            # Broadcast to all connected users
            for connection in active_connections.copy():
                await connection.send_json(message)

    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)