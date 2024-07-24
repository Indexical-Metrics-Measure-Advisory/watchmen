from enum import Enum

from typing import List, Optional

from pydantic import BaseModel

from watchmen_ai.model.copilot_intent import CopilotTask
from watchmen_model.admin import Topic, Factor


class AskAIBase(BaseModel):
    tenantId: str


class AskAIGenerateFactors(AskAIBase):
    topic: Topic
    limit: int


class AskAIGenerateFactorsResponse(AskAIBase):
    suggestionFactors: List[Factor] = []
    response: Optional[str] = None


class ChatIntent(Enum):
    init_analyze = "init_analyze"
    ask_data = "ask_data"
    complete_form = "action"
    ask_chart = "ask_chart"
    subscribe = "subscribe"
    persist = "persist"
    ask_question = "ask_question"


class ObjectiveIntent(Enum):
    recommend = "recommend"
    ask_data_for_business_target = "ask_data_for_business_target"
    find_lineage_for_business_target = "find_lineage_for_business_target"
    insight_for_business_target = "insight_for_business_target"



class ChatContext(BaseModel):
    sessionId: str = None
    context_type: str = None
    memory: dict = {}
    current_token:Optional[str] = None


class  ChatTaskContext(BaseModel):
    token: str = None
    main_task: CopilotTask = None
    current_status: str = None
    sub_tasks:List[str] = []
    parameters: dict = {}
    confirm: bool = False