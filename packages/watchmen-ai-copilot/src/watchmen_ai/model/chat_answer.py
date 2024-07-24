from enum import Enum
from pydantic import BaseModel
from typing import Optional, List, Any


class CopilotAnswerItemType(str, Enum):
    OPTION = 'option',
    MARKDOWN = 'markdown'
    SVG = 'svg'


class CopilotAnswerItem(BaseModel):
    type: Optional[CopilotAnswerItemType] = None


class CopilotAnswerOption(CopilotAnswerItem):
    type: Optional[CopilotAnswerItemType] = CopilotAnswerItemType.OPTION
    text: Optional[str] = None
    token: Optional[str] = None
    action: Optional[str] = None
    vertical: Optional[bool] = None;


class CopilotAnswerMarkdown(CopilotAnswerItem):
    type: Optional[CopilotAnswerItemType] = CopilotAnswerItemType.MARKDOWN
    content: Optional[str] = None


class CopilotAnswerSVG(CopilotAnswerItem):
    type: Optional[CopilotAnswerItemType] = CopilotAnswerItemType.SVG
    content: Optional[str] = None


class CopilotAnswer(BaseModel):
    data: List[Any] = []


class CopilotAnswerWithSession(CopilotAnswer):
    sessionId: Optional[str] = None


class OngoingCopilotAnswer(CopilotAnswerWithSession):
    token: Optional[str] = None


class RecommendationType(str, Enum):
    CONNECTED_SPACE = 'connected-space'
