from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_ai.model.chat_answer import CopilotAnswerWithSession
from watchmen_ai.model.copilot_intent import CopilotIntent
from watchmen_ai.model.index import ChatContext
from watchmen_ai.router.chat_router import get_last_snapshot_service
from watchmen_ai.router.objective_chat_router import get_greet_intent_configuration, \
    mapping_task_to_option_with_vertical
from watchmen_ai.session.session_managment import SessionManager, get_session_manager
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.console import ConnectedSpaceService
from watchmen_meta.gui import LastSnapshotService
from watchmen_model.admin import UserRole
from watchmen_model.console import ConnectedSpace
from watchmen_model.gui import LastSnapshot
from watchmen_rest import get_console_principal


class ConnectSpaceChatReq(BaseModel):
    connectSpaceId: str
    sessionId: str
    recommendation: bool


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
    return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


router = APIRouter()


@router.post("/connected-space/new-session", tags=[UserRole.CONSOLE], response_model=CopilotAnswerWithSession)
def chat_new_session_for_objective(connected_space_req: ConnectSpaceChatReq,
                                   principal_service: PrincipalService = Depends(
                                       get_console_principal)) -> CopilotAnswerWithSession:
    session_manager: SessionManager = get_session_manager()
    session_id = connected_space_req.sessionId

    last_snapshot_service: LastSnapshotService = get_last_snapshot_service(principal_service)

    def action_last_snapshot() -> Optional[LastSnapshot]:
        return last_snapshot_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    last_snapshot = trans(last_snapshot_service, action_last_snapshot)

    language = last_snapshot.language

    connected_space_service = get_connected_space_service(principal_service)

    def action() -> Optional[ConnectedSpace]:
        return connected_space_service.find_by_id(connected_space_req.connectSpaceId)

    connected_space = trans(connected_space_service, action)

    session_manager.create_session(connected_space_req.sessionId, ChatContext(context_type="connected_space",
                                                                              memory={
                                                                                  "connected_space": connected_space}))

    answer = CopilotAnswerWithSession(sessionId=connected_space_req.sessionId, data=[])

    greeting_intent: CopilotIntent = get_greet_intent_configuration(language, "connected_space")
    answer.data.append(greeting_intent.intentDescription)

    option_list = mapping_task_to_option_with_vertical(greeting_intent.tasks,
                                                       connected_space_service.snowflakeGenerator, language,
                                                       session_id, session_manager)
    answer.data.extend(option_list)
    return answer
