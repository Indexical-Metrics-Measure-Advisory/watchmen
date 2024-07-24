from fastapi import APIRouter, Depends
from openai import BaseModel
from typing import Optional, List, Dict

from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.model.chat_answer import OngoingCopilotAnswer
from watchmen_ai.model.index import ChatContext, ChatTaskContext
from watchmen_ai.router.utils import build_yes_no_item
from watchmen_ai.service.chat_service import ChatService
from watchmen_ai.service.objective_chat_service import chat_on_objective, build_summary_markdown_for_business_target
from watchmen_ai.session.session_managment import get_session_manager
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.gui import LastSnapshotService
from watchmen_meta.system.ai_model_service import AIModelService
from watchmen_model.admin import UserRole
from watchmen_model.gui import LastSnapshot
from watchmen_model.indicator import DerivedObjective
from watchmen_model.system.ai_model import AIModel
from watchmen_rest import get_console_principal

router = APIRouter()


def get_ai_service(principal_service: PrincipalService) -> AIModelService:
    return AIModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_last_snapshot_service(principal_service: PrincipalService) -> LastSnapshotService:
    return LastSnapshotService(ask_meta_storage(), principal_service)



class FreeChatRequest(BaseModel):
    sessionId: Optional[str] = None
    replyTo: Optional[str] = None
    token: Optional[str] = None


class AskOptionRq(BaseModel):
    sessionId: Optional[str] = None
    token: Optional[str] = None
    action: Optional[str] = None


def get_chat_service() -> ChatService:
    return ChatService()


#
# @router.post("/free-chat")

@router.post("/free-chat", tags=[UserRole.CONSOLE], response_model=OngoingCopilotAnswer)
def chat_on_action(free_chat_req: FreeChatRequest, principal_service: PrincipalService = Depends(
    get_console_principal)) -> OngoingCopilotAnswer:
    chat_service = get_chat_service()
    ai_service: AIModelService = get_ai_service(principal_service)
    ai_model: AIModel = ai_service.find_by_tenant(principal_service.tenantId)
    chat_context: ChatContext = chat_service.find_chat_context(free_chat_req.sessionId)

    last_snapshot_service: LastSnapshotService = get_last_snapshot_service(principal_service)
    def action_last_snapshot() -> Optional[LastSnapshot]:
        return last_snapshot_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    last_snapshot = trans(last_snapshot_service, action_last_snapshot)

    language = last_snapshot.language

    if chat_context is None:
        return create_new_session(free_chat_req, principal_service)
    elif chat_context.context_type == "objective":
        return chat_on_objective(free_chat_req.sessionId, free_chat_req.token, free_chat_req.replyTo, principal_service,
                                 ai_model,language)
    else:
        raise Exception("not support yet")


def check_depends(depend_list: List[str], parameter_dict: Dict) -> (bool, str):
    for depend in depend_list:
        if depend not in parameter_dict:
            return False, depend
    return True, "pass"


def peek_stack(stack):
    if stack:
        return stack[-1]


@router.post("/ask-option-details", tags=[UserRole.CONSOLE], response_model=OngoingCopilotAnswer)
def ask_option_detail(ask_option_rq: AskOptionRq, principal_service: PrincipalService = Depends(
    get_console_principal)) -> OngoingCopilotAnswer:
    answer = OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId)


    last_snapshot_service: LastSnapshotService = get_last_snapshot_service(principal_service)
    def action_last_snapshot() -> Optional[LastSnapshot]:
        return last_snapshot_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    last_snapshot = trans(last_snapshot_service, action_last_snapshot)

    language = last_snapshot.language

    session_manager = get_session_manager()
    task_context: ChatTaskContext = session_manager.find_token_memory(ask_option_rq.sessionId, ask_option_rq.token)
    chat_context: ChatContext = session_manager.get_session(ask_option_rq.sessionId)
    # print(ask_option_rq.token)
    chat_context.current_token = ask_option_rq.token

    if task_context.confirm and chat_context.context_type == "objective":
        if ask_option_rq.action == "yes":
            derived_objective:DerivedObjective=  chat_context.memory["derived_objective"]

            print(task_context.main_task)

            markdown_answer = build_summary_markdown_for_business_target(derived_objective.definition,task_context.parameters["business_target"],principal_service,language)

            return OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId, data=[markdown_answer])
        else:
            return OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId, data=["cancel"])

    # build stack for task

    depends: List[str] = task_context.main_task.depends
    task_context.sub_tasks = depends
    if task_context.sub_tasks:
        key = task_context.sub_tasks[-1]
        answer.data.append(get_message_by_lang(language, key))
        return answer
    else:
        answer = OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId, data=[get_message_by_lang(language, "confirm")])
        task_context.confirm = True
        options = build_yes_no_item(ask_option_rq.token,language)
        for option in options:
            answer.data.append(option)
        return answer


def create_new_session(free_chat_req: FreeChatRequest, principal_service: PrincipalService) -> OngoingCopilotAnswer:
    chat_service = get_chat_service()

    answer = OngoingCopilotAnswer(sessionId="new_", data=["session is not find, create new session"])
    return answer
