from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_hub import ws_hub

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/live-tracking/{train_number}")
async def websocket_live_tracking(websocket: WebSocket, train_number: str):
    await ws_hub.connect(train_number, websocket)
    try:
        while True:
            # Keep socket alive and receive any client ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        await ws_hub.disconnect(train_number, websocket)
    except Exception:
        await ws_hub.disconnect(train_number, websocket)
