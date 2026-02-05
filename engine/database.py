from sqlmodel import SQLModel, Field, JSON, create_engine, Session
from typing import List, Optional, Dict
from datetime import datetime
import os

# Define database file path
SQLITE_FILE_NAME = "diandian.db"
DATABASE_URL = f"sqlite:///{SQLITE_FILE_NAME}"

engine = create_engine(DATABASE_URL)

class TestCase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    # Use JSON column to store list of prompt strings
    prompts: List[str] = Field(default=[], sa_type=JSON) 
    # Use JSON column to store config dict
    config: Dict = Field(default={}, sa_type=JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TestRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="testcase.id")
    status: str # "PASS", "FAIL"
    logs: str = Field(default="") # Simple text logs or JSON string
    duration: int = Field(default=0) # Duration in seconds
    report_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
