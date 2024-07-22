from typing import List, Dict, Any

from pydantic import BaseModel

from watchmen_ai.model.index import ChatIntent


class CopilotTask(BaseModel):
    task: str
    description: str = None
    parameters: Dict[str, Any] = None


class CopilotIntent(BaseModel):

    intent: ChatIntent = None
    tasks:List[str]   = []
    intentDescription: str = None

