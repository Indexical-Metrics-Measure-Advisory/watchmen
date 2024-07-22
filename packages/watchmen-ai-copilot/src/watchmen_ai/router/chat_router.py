from enum import Enum
from fastapi import APIRouter, Depends
from openai import BaseModel
from typing import Optional

from watchmen_ai.model.chat_answer import CopilotAnswerWithSession, OngoingCopilotAnswer
from watchmen_ai.model.copilot_intent import CopilotIntent
from watchmen_ai.model.index import ChatContext
from watchmen_ai.service.chat_service import ChatService
from watchmen_ai.service.objective_chat_service import chat_on_objective
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.system.ai_model_service import AIModelService
from watchmen_model.admin import UserRole
from watchmen_model.system.ai_model import AIModel
from watchmen_rest import get_console_principal

router = APIRouter()

def get_ai_service(principal_service: PrincipalService) -> AIModelService:
    return AIModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)



class FreeChatRequest(BaseModel):
    sessionId: Optional[str] = None
    replyTo: Optional[str] = None
    token: Optional[str] = None



def get_chat_service()->ChatService:
    return ChatService()
#
# @router.post("/free-chat")

@router.post("/free-chat", tags=[UserRole.CONSOLE], response_model=OngoingCopilotAnswer)
def chat_on_action(free_chat_req: FreeChatRequest, principal_service: PrincipalService = Depends(
    get_console_principal))->CopilotAnswerWithSession:
    chat_service = get_chat_service()
    ai_service:AIModelService = get_ai_service(principal_service)
    ai_model: AIModel = ai_service.find_by_tenant(principal_service.tenantId)
    chat_context:ChatContext = chat_service.find_chat_context(free_chat_req.sessionId)

    if chat_context is None:
        return create_new_session(free_chat_req, principal_service)
    elif chat_context.context_type == "objective":
        return chat_on_objective(free_chat_req, principal_service)
    else:
        raise Exception("not support yet")






def create_new_session(free_chat_req: FreeChatRequest, principal_service: PrincipalService)->CopilotAnswerWithSession:
    chat_service = get_chat_service()

    answer = OngoingCopilotAnswer(sessionId="new_", data=["session is not find, create new session"])
    return answer

