import socketio
from fastapi import FastAPI
import uvicorn
import sys
import asyncio
from browser.driver import BrowserController
from agent.core import DiandianAgent

# Create a Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()

# Wrap with ASGI application
socket_app = socketio.ASGIApp(sio, app)

# Global Components
browser = BrowserController()
agent = DiandianAgent(browser)

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
    
    # Define a helper to emit back to this specific client
    async def emit_to_client(event, payload):
        await sio.emit(event, payload, room=sid)

    # Hand off to Agent
    user_text = data.get('data', '')
    if user_text:
        await agent.process_command(user_text, emit_func=emit_to_client)
        await sio.emit('response', {'data': f"Agent processed: {user_text}"})


# --- Browser Control Events (Legacy/Direct) ---

@sio.event
async def start_browser(sid, data):
    print("Received start_browser command")
    await browser.start(headless=False)
    await sio.emit('response', {'data': 'Browser Started'})

@sio.event
async def navigate(sid, url):
    # Route through Agent now to standardize
    print(f"Direct navigate request: {url}")
    
    async def emit_to_client(event, payload):
        await sio.emit(event, payload, room=sid)
        
    await agent.process_command(url, emit_func=emit_to_client)


# ------------------------------

if __name__ == "__main__":
    port = 8000
    print(f"Python Engine starting on port {port}")
    sys.stdout.flush() 
    
    uvicorn.run(socket_app, host="0.0.0.0", port=port)
