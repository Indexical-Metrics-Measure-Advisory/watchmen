from enum import Enum
from typing import List, Dict, Any, Optional

from pydantic import BaseModel


class CopilotTask(BaseModel):
    task_name: str = None
    token: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    depends: Optional[List[str]] = None
    withConfirm: Optional[bool] = False


class CopilotIntent(BaseModel):
    intent: Optional[Enum] = None
    tasks: Optional[List[CopilotTask]] = None
    intentDescription: str = None
