import socketio
from fastapi import FastAPI
import uvicorn
import sys

# Create a Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()

# Wrap with ASGI application
socket_app = socketio.ASGIApp(sio, app)

@app.get("/")
def read_root():
    return {"message": "DianDian Python Engine is Running"}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit('message', {'data': 'Connected to Python Engine'})

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def message(sid, data):
    print(f"Received message from {sid}: {data}")
    # Echo back
    await sio.emit('response', {'data': f"Echo: {data}"})

if __name__ == "__main__":
    port = 8000
    # Notify parent process (Electron) about the port
    # In a real dynamic port scenario, we'd pick a free port and print it
    print(f"Python Engine starting on port {port}")
    sys.stdout.flush() 
    
    uvicorn.run(socket_app, host="127.0.0.1", port=port)
