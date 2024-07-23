from fastapi import APIRouter, Depends
from fastapi import APIRouter, Depends
from openai import BaseModel
from typing import Optional, List, Dict

from watchmen_ai.model.chat_answer import OngoingCopilotAnswer
from watchmen_ai.model.index import ChatContext, ChatTaskContext
from watchmen_ai.service.chat_service import ChatService
from watchmen_ai.service.objective_chat_service import chat_on_objective
from watchmen_ai.session.session_managment import get_session_manager
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


class AskOptionRq(BaseModel):
    sessionId: Optional[str] = None
    token: Optional[str] = None

def get_chat_service()->ChatService:
    return ChatService()
#
# @router.post("/free-chat")

@router.post("/free-chat", tags=[UserRole.CONSOLE], response_model=OngoingCopilotAnswer)
def chat_on_action(free_chat_req: FreeChatRequest, principal_service: PrincipalService = Depends(
    get_console_principal))->OngoingCopilotAnswer:
    chat_service = get_chat_service()
    ai_service:AIModelService = get_ai_service(principal_service)
    ai_model: AIModel = ai_service.find_by_tenant(principal_service.tenantId)
    chat_context:ChatContext = chat_service.find_chat_context(free_chat_req.sessionId)

    if chat_context is None:
        return create_new_session(free_chat_req, principal_service)
    elif chat_context.context_type == "objective":
        return chat_on_objective(free_chat_req.sessionId,free_chat_req.token,free_chat_req.replyTo, principal_service,ai_model)
    else:
        raise Exception("not support yet")



def check_depends(depend_list:List[str],parameter_dict:Dict)->(bool,str):
    for depend in depend_list:
        if depend not in parameter_dict:
            return False,depend
    return True,"pass"


@router.post("/ask-option-details", tags=[UserRole.CONSOLE], response_model=OngoingCopilotAnswer)
def ask_option_detail(ask_option_rq: AskOptionRq,principal_service: PrincipalService = Depends(
    get_console_principal))->OngoingCopilotAnswer:

    answer = OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId)

    session_manager = get_session_manager()

    task_context:ChatTaskContext = session_manager.find_token_memory(ask_option_rq.sessionId, ask_option_rq.token)


    # check parameter include all depends
    depends:List[str] = task_context.main_task.depends
    parameter_dict:Dict =  task_context.parameters
    check_result,depend = check_depends(depends,parameter_dict)
    if check_result:

        return answer
    else:
        answer.data.append(depend)
        answer.token = ask_option_rq.token
        return answer





def create_new_session(free_chat_req: FreeChatRequest, principal_service: PrincipalService)->OngoingCopilotAnswer:
    chat_service = get_chat_service()

    answer = OngoingCopilotAnswer(sessionId="new_", data=["session is not find, create new session"])
    return answer

