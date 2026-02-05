import socketio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import asyncio
from browser.driver import BrowserController
from agent.core import DiandianAgent
from database import create_db_and_tables, TestCase, get_session, engine
from sqlmodel import Session, select
import os
from datetime import datetime

# Initialize DB with lifespan
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    yield
    # Shutdown (if needed)

# Create a Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI(lifespan=lifespan)

# Enable CORS for HTTP requests (needed for fetch /api/reports from localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev, allow all. Prod: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Reports Directory
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")



# Wrap with ASGI application
socket_app = socketio.ASGIApp(sio, app)

# Global Components
agent = DiandianAgent()

@app.get("/")
def read_root():
    return {"message": "DianDian Python Engine is Running"}

@app.get("/api/reports")
def get_reports():
    """List all generated reports."""
    reports = []
    if os.path.exists(REPORTS_DIR):
        # List subdirectories (each report is a folder)
        for item in os.listdir(REPORTS_DIR):
            item_path = os.path.join(REPORTS_DIR, item)
            if os.path.isdir(item_path):
                # Try to find an index.html or just link the folder
                # Our report format: task_id_timestamp/
                try:
                    # Simple parsing: assume folder name has timestamp or just use creating time
                    timestamp = os.path.getctime(item_path)
                    date_str = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
                    reports.append({
                        "id": item,
                        "date": date_str,
                        "path": f"/reports/{item}/index.html" # Assuming index.html exists
                    })
                except Exception as e:
                    print(f"Error parsing report {item}: {e}")
    
    # Sort by date desc
    reports.sort(key=lambda x: x['date'], reverse=True)
    return {"reports": reports}

# ... rest of the file (Task Management, Socket Events, etc) ...

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
async def interact(sid, data):
    """
    Handle Point & Teach interaction from frontend.
    data: { x: float, y: float }
    """
    x = data.get("x")
    y = data.get("y")
    if x is not None and y is not None:
        await agent.handle_interaction(x, y)
        await sio.emit('response', {'data': "👆 Target Locked. Agent updated."}, room=sid)

@sio.event
async def stop(sid, data):
    # ... (existing stop handler)
    global current_task
    print(f"Received STOP command from {sid}")
    if current_task and not current_task.done():
        current_task.cancel()
        await sio.emit('response', {'data': "Stopping agent..."}, room=sid)
    else:
         await sio.emit('response', {'data': "No active task to stop."}, room=sid)

# --- Case Management API (v1.1) ---

@sio.event
async def save_case(sid, data):
    """
    Save current conversation/task as a Test Case.
    data: { name: str, prompts: List[str], description: str }
    """
    print(f"Saving case: {data}")
    try:
        case = TestCase(
            name=data.get("name"),
            description=data.get("description", ""),
            prompts=data.get("prompts", []),
            config=data.get("config", {})
        )
        with Session(engine) as session:
            session.add(case)
            session.commit()
            session.refresh(case)
        
        await sio.emit('save_case_success', {'id': case.id, 'name': case.name}, room=sid)
    except Exception as e:
        print(f"Save Case Error: {e}")
        await sio.emit('error', {'message': f"Failed to save case: {str(e)}"}, room=sid)

@sio.event
async def load_cases(sid, data):
    """List all saved test cases."""
    try:
        with Session(engine) as session:
            statement = select(TestCase).order_by(TestCase.created_at.desc())
            results = session.exec(statement).all()
            # Serialize
            cases = [c.model_dump() for c in results]
            
            # Helper for datetime serialization if needed, but model_dump usually handles it well or returns datetime obj
            # We might need to convert datetime to str for json
            for c in cases:
                if c.get('created_at'):
                   c['created_at'] = c['created_at'].isoformat()

        await sio.emit('cases_list', cases, room=sid)
    except Exception as e:
        print(f"Load Cases Error: {e}")
        await sio.emit('error', {'message': f"Failed to load cases: {str(e)}"}, room=sid)

@sio.event
async def replay_case(sid, data):
    """
    Replay a specific test case by ID.
    data: { case_id: int }
    """
    global current_task
    case_id = data.get("case_id")
    print(f"Replaying Case ID: {case_id}")
    
    if current_task and not current_task.done():
        await sio.emit('error', {'message': "Agent is busy."}, room=sid)
        return

    # Fetch Case
    case = None
    with Session(engine) as session:
        case = session.get(TestCase, case_id)
    
    if not case:
        await sio.emit('error', {'message': "Case not found."}, room=sid)
        return

    # Logic to replay prompts sequentially
    # For MVP v1.1, we just chain them? Or feed one by one?
    # Ideally, we create a wrapper task that executes them sequentially.
    
    async def emit_to_client(event, payload):
        await sio.emit(event, payload, room=sid)

    async def execute_replay_flow(prompts, sid):
        global current_task
        try:
             await sio.emit('processing_state', {'status': 'running', 'mode': 'replay'}, room=sid)
             for prompt in prompts:
                 print(f"Replay Step: {prompt}")
                 await sio.emit('replay_step_start', {'prompt': prompt}, room=sid)
                 await agent.process_command(prompt, emit_func=emit_to_client)
                 await asyncio.sleep(1) # Breath
             
             await sio.emit('response', {'data': "✅ Replay Completed successfully."}, room=sid)
        except Exception as e:
             print(f"Replay Error: {e}")
             await sio.emit('response', {'data': f"Replay Failed: {str(e)}"}, room=sid)
        finally:
             current_task = None
             await sio.emit('processing_state', {'status': 'idle'}, room=sid)

    current_task = asyncio.create_task(execute_replay_flow(case.prompts, sid))



@sio.event
async def update_config(sid, data):
    """
    Update browser configuration (e.g. device emulation).
    data: { preset: str }
    """
    preset = data.get("preset", "desktop")
    print(f"Updating config to: {preset}")
    # Restart browser with new config
    # We might need to ensure no task is running, or just force it.
    # For now, we assume user does this when idle.
    await agent.browser.restart_with_config(preset)
    await sio.emit('config_updated', {'preset': preset}, room=sid)

@sio.event
async def update_env_config(sid, data):
    key = data.get("key")
    value = data.get("value")
    if key and value:
        agent.update_env_config(key, value)
        await sio.emit('env_config_updated', agent.env_config, room=sid)


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
