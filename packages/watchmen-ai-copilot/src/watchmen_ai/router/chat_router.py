from typing import Optional, List, Dict

from fastapi import APIRouter, Depends
from openai import BaseModel

from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.model.chat_answer import OngoingCopilotAnswer
from watchmen_ai.model.index import ChatContext, ChatTaskContext
from watchmen_ai.router.utils import build_yes_no_item
from watchmen_ai.service.chat_service import ChatService
from watchmen_ai.service.objective_chat_service import chat_on_objective, build_summary_markdown_for_business_target
from watchmen_ai.session.session_managment import get_session_manager, SessionManager
from watchmen_ai.task.confirm_message import ConfirmMessageGenerate
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

SUBJECT = "subject"

OBJECTIVE = "objective"

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
    session_manager: SessionManager = get_session_manager()
    # chat_service = get_chat_service()
    ai_service: AIModelService = get_ai_service(principal_service)
    ai_model: AIModel = ai_service.find_by_tenant(principal_service.tenantId)
    chat_context: ChatContext = session_manager.get_session(free_chat_req.sessionId)
    language = get_last_snapshot_language(principal_service)

    if chat_context.context_type == OBJECTIVE:
        return chat_on_objective(free_chat_req.sessionId, free_chat_req.token, free_chat_req.replyTo, principal_service,
                                 ai_model, ai_service.snowflakeGenerator, language)

    elif chat_context.context_type == SUBJECT:
        pass  # TODO
    else:
        raise Exception("not support yet")


def get_last_snapshot_language(principal_service) -> str:
    last_snapshot_service: LastSnapshotService = get_last_snapshot_service(principal_service)

    def action_last_snapshot() -> Optional[LastSnapshot]:
        return last_snapshot_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    last_snapshot = trans(last_snapshot_service, action_last_snapshot)
    return last_snapshot.language


def process_objective_logic(ask_option_rq, chat_context, task_context, principal_service,
                            language) -> OngoingCopilotAnswer:
    if ask_option_rq.action == "yes":
        derived_objective: DerivedObjective = chat_context.memory["derived_objective"]
        markdown_answer = build_summary_markdown_for_business_target(derived_objective.definition,
                                                                     task_context.parameters["business_target"],
                                                                     principal_service, language)

        clear_task_context(task_context)
        clear_chat_context(chat_context)

        return OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId, data=[markdown_answer])
    else:
        return OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId, data=["cancel"])


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
    chat_context.current_token = ask_option_rq.token

    if task_context.confirm and chat_context.context_type == OBJECTIVE:
        return process_objective_logic(ask_option_rq, chat_context, task_context, principal_service, language)

    task_context.history.append({"question": task_context.main_task.description})
    depends: List[str] = task_context.main_task.depends
    task_context.sub_tasks = depends.copy()
    if task_context.sub_tasks:
        key = task_context.sub_tasks[-1]
        answer.data.append(get_message_by_lang(language, key))
        return answer
    else:

        answer = OngoingCopilotAnswer(sessionId=ask_option_rq.sessionId,
                                      data=[get_message_by_lang(language, "confirm")])
        task_context.confirm = True
        options = build_yes_no_item(ask_option_rq.token, language)
        for option in options:
            answer.data.append(option)
        return answer


def get_confirm_message(language, task_context):
    try:
        action = ConfirmMessageGenerate()
        message = action.run((task_context.history, language),
                             AzureModelLoader().get_llm_model())
        return message
    except Exception as e:
        print(e)
        return "confirm"


def create_new_session(free_chat_req: FreeChatRequest, principal_service: PrincipalService) -> OngoingCopilotAnswer:
    chat_service = get_chat_service()

    answer = OngoingCopilotAnswer(sessionId="new_", data=["session is not find, create new session"])
    return answer


def check_depends(depend_list: List[str], parameter_dict: Dict) -> (bool, str):
    for depend in depend_list:
        if depend not in parameter_dict:
            return False, depend
    return True, "pass"


def peek_stack(stack):
    if stack:
        return stack[-1]


def clear_task_context(task_context: ChatTaskContext):
    task_context.sub_tasks = []
    task_context.confirm = False
    task_context.parameters = {}
    task_context.history = []


def clear_chat_context(chat_context: ChatContext):
    chat_context.current_token = None
