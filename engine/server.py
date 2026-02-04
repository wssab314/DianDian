import socketio
from fastapi import FastAPI
import uvicorn
import sys
import asyncio
from browser.driver import BrowserController

# Create a Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()

# Wrap with ASGI application
socket_app = socketio.ASGIApp(sio, app)

# Global Browser Controller
browser = BrowserController()

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
    # Optional: cleanup browser on disconnect?
    # await browser.stop()

@sio.event
async def message(sid, data):
    print(f"Received message from {sid}: {data}")
    await sio.emit('response', {'data': f"Echo: {data}"})

# --- Browser Control Events ---

@sio.event
async def start_browser(sid, data):
    print("Received start_browser command")
    await browser.start(headless=False) # Debug mode: show browser
    await sio.emit('response', {'data': 'Browser Started'})

@sio.event
async def navigate(sid, url):
    print(f"Received navigate command: {url}")
    await browser.navigate(url)
    screenshot = await browser.capture_screenshot()
    if screenshot:
        await sio.emit('browser_snapshot', {'image': screenshot})
    await sio.emit('response', {'data': f'Navigated to {url}'})

# ------------------------------

if __name__ == "__main__":
    port = 8000
    print(f"Python Engine starting on port {port}")
    sys.stdout.flush() 
    
    uvicorn.run(socket_app, host="0.0.0.0", port=port)
