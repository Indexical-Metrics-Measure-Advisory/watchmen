from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List

from watchmen_ai.model.chat_answer import CopilotAnswerWithSession, CopilotAnswerOption
from watchmen_ai.model.copilot_intent import CopilotIntent, CopilotTask
from watchmen_ai.model.index import ChatContext, ChatTaskContext
from watchmen_ai.service.task_configuration import CopilotTaskConfiguration
from watchmen_ai.session.session_managment import SessionManager, get_session_manager
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import DerivedObjectiveService, ObjectiveService
from watchmen_indicator_surface.util import trans
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.gui import LastSnapshotService
from watchmen_model.admin import UserRole
from watchmen_model.gui import LastSnapshot
from watchmen_model.indicator import DerivedObjective
from watchmen_rest import get_console_principal
from watchmen_storage import SnowflakeGenerator

router = APIRouter()


def get_derived_objective_service(principal_service: PrincipalService) -> DerivedObjectiveService:
    return DerivedObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_greet_intent_configuration(language: str = "en") -> CopilotIntent:
    return CopilotTaskConfiguration().load_intent_configuration(language)


def get_last_snapshot_service(principal_service: PrincipalService) -> LastSnapshotService:
    return LastSnapshotService(ask_meta_storage(), principal_service)


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
    return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class DerivedObjectiveChatReq(BaseModel):
    derivedObjectiveId: str
    sessionId: str
    recommendation: bool





def mapping_task_to_option_with_vertical(copilot_task_list: List[CopilotTask], snowflakeGenerator: SnowflakeGenerator,
                                         language, session_id: str, session_manager: SessionManager) -> List[
    CopilotAnswerOption]:
    option_list = []
    if copilot_task_list is None:
        return []
    else:
        token = str(snowflakeGenerator.next_id())
        first_task = copilot_task_list[0]
        task_context = ChatTaskContext(token=token, main_task=first_task, current_status="init", parameters={})
        session_manager.add_token_memory(session_id, token, task_context)
        first_option = CopilotAnswerOption(text=first_task.description, action=first_task.task_name, vertical=True,
                                           token=token)
        option_list.append(first_option)

        for task in copilot_task_list[1:]:
            token = str(snowflakeGenerator.next_id())
            task_context = ChatTaskContext(token=token, main_task=task, current_status="init", parameters={},
                                           )

            session_manager.add_token_memory(session_id, token, task_context)
            option = CopilotAnswerOption(text=task.description, action=task.task_name, vertical=False, token=token)
            option_list.append(option)

        return option_list


@router.post("/derived-objective/new-session", tags=[UserRole.CONSOLE], response_model=CopilotAnswerWithSession)
def chat_new_session_for_objective(derived_objective_req: DerivedObjectiveChatReq,
                                   principal_service: PrincipalService = Depends(
                                       get_console_principal)) -> CopilotAnswerWithSession:
    session_manager: SessionManager = get_session_manager()
    session_id = derived_objective_req.sessionId

    last_snapshot_service: LastSnapshotService = get_last_snapshot_service(principal_service)

    def action_last_snapshot() -> Optional[LastSnapshot]:
        return last_snapshot_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    last_snapshot = trans(last_snapshot_service, action_last_snapshot)

    language = last_snapshot.language

    derived_objective_service = get_derived_objective_service(principal_service)

    def action() -> Optional[DerivedObjective]:
        return derived_objective_service.find_by_id(derived_objective_req.derivedObjectiveId)

    derived_objective = trans(derived_objective_service, action)

    session_manager.create_session(derived_objective_req.sessionId, ChatContext(context_type="objective",
                                                                                memory={
                                                                                    "derived_objective": derived_objective}))

    answer = CopilotAnswerWithSession(sessionId=derived_objective_req.sessionId, data=[])

    greeting_intent: CopilotIntent = get_greet_intent_configuration(language)
    answer.data.append(greeting_intent.intentDescription)

    option_list = mapping_task_to_option_with_vertical(greeting_intent.tasks,
                                                       derived_objective_service.snowflakeGenerator, language,
                                                       session_id, session_manager)
    answer.data.extend(option_list)
    return answer
