import socketio
from fastapi import FastAPI
import uvicorn
import sys
import asyncio
from browser.driver import BrowserController
from agent.core import DiandianAgent
from database import create_db_and_tables

# Create a Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()

# Mount Reports Directory
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")

# Initialize DB
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Wrap with ASGI application
socket_app = socketio.ASGIApp(sio, app)

# Global Components
agent = DiandianAgent()

@app.get("/")
def read_root():
    return {"message": "DianDian Python Engine is Running"}

# Task Management
current_task = None

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit('message', {'data': 'Connected to Python Engine'})
    # Reset state on new connection? Or sync?
    # For now assume single user
    if current_task and not current_task.done():
        await sio.emit('processing_state', {'status': 'running'})
    else:
        await sio.emit('processing_state', {'status': 'idle'})

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def message(sid, data):
    global current_task
    print(f"Received message from {sid}: {data}")
    
    # Check if busy
    if current_task and not current_task.done():
        await sio.emit('response', {'data': "⚠️ Agent is busy. Please stop current task first."}, room=sid)
        return

    # Define a helper to emit back to this specific client
    async def emit_to_client(event, payload):
        await sio.emit(event, payload, room=sid)

    async def handle_agent_task(text, sid):
         global current_task
         try:
             await sio.emit('processing_state', {'status': 'running'}, room=sid)
             await agent.process_command(text, emit_func=emit_to_client)
             await sio.emit('response', {'data': f"Agent finished: {text}"}, room=sid)
         except asyncio.CancelledError:
             print("Agent task cancelled")
             await sio.emit('response', {'data': "🛑 Task stopped by user."}, room=sid)
         except Exception as e:
             print(f"Agent Task Error: {e}")
             await sio.emit('response', {'data': f"Error: {str(e)}"}, room=sid)
         finally:
             current_task = None
             await sio.emit('processing_state', {'status': 'idle'}, room=sid)

    # Hand off to Agent (Non-blocking)
    user_text = data.get('data', '')
    if user_text:
        # Fire and forget (or track mechanism if needed)
        current_task = asyncio.create_task(handle_agent_task(user_text, sid))

@sio.event
async def stop(sid, data):
    global current_task
    print(f"Received STOP command from {sid}")
    if current_task and not current_task.done():
        current_task.cancel()
        await sio.emit('response', {'data': "Stopping agent..."}, room=sid)
    else:
         await sio.emit('response', {'data': "No active task to stop."}, room=sid)


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
