from enum import Enum

from pydantic import BaseModel
from typing import List, Dict, Any


class CopilotTask(BaseModel):
    task_name: str = None
    token: str = None
    description: str = None
    parameters: Dict[str, Any] = None
    depends: List[str] = None


class CopilotIntent(BaseModel):
    intent: Enum = None
    tasks: List[CopilotTask] = []
    intentDescription: str = None
